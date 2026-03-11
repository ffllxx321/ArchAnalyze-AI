import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  BarChart3, 
  History, 
  Settings, 
  Plus, 
  Download, 
  FileText, 
  ChevronRight, 
  Star, 
  MapPin, 
  MessageSquare,
  Building2,
  Box,
  Database,
  CreditCard,
  Gauge,
  Edit3,
  RefreshCw,
  Table,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import Papa from 'papaparse';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Brand, Material, Hotspot, AnalysisResult, BudgetEntry, Showroom } from './types';
import { BrandLibrary } from './components/BrandLibrary';
import { ShowroomMap } from './components/ShowroomMap';
import { mockShowrooms, mockBrands } from './data/mockData';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [view, setView] = useState<'dashboard' | 'analysis' | 'report'>('dashboard');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [budgetEntries, setBudgetEntries] = useState<BudgetEntry[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [changeRequest, setChangeRequest] = useState('');
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [imageHeight, setImageHeight] = useState<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // New states for settings and brand DB
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [isBrandDbOpen, setIsBrandDbOpen] = useState(false);
  const [isAppSettingOpen, setIsAppSettingOpen] = useState(false);
  const [allBrands, setAllBrands] = useState<Brand[]>(mockBrands);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [selectedShowroom, setSelectedShowroom] = useState<Showroom | null>(null);

  // AI Settings
  const [visionModel, setVisionModel] = useState<string>(localStorage.getItem('visionModel') || 'qwen3.5-flash');
  const [imageModel, setImageModel] = useState<string>(localStorage.getItem('imageModel') || 'qwen-image-2.0');
  const [qwenApiKey, setQwenApiKey] = useState<string>(localStorage.getItem('qwenApiKey') || '');

  const [newBrand, setNewBrand] = useState<Partial<Brand>>({
    name: '',
    category: '地板',
    sub_category: '实木地板',
    material_type: '实木地板',
    model: '',
    price: 0,
    supplier: '',
    unit: 'm²'
  });

  // Measure image height
  useEffect(() => {
    if (imageContainerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setImageHeight(entry.contentRect.height);
        }
      });
      observer.observe(imageContainerRef.current);
      return () => observer.disconnect();
    }
  }, [view, analysisResult]);

  // Fetch all brands for the DB modal
  const fetchAllBrands = () => {
    // No longer fetching from API, using local state
    setAllBrands([...allBrands]);
  };

  useEffect(() => {
    if (isBrandDbOpen) {
      fetchAllBrands();
    }
  }, [isBrandDbOpen]);

  const handleNewProject = () => {
    const confirm = window.confirm('是否创建新项目？当前未保存的更改将会丢失。');
    if (confirm) {
      setSelectedImage(null);
      setAnalysisResult(null);
      setSelectedHotspot(null);
      setBudgetEntries([]);
      setView('dashboard');
      setIsSettingsDropdownOpen(false);
    }
  };

  const handleSaveBrand = async () => {
    if (!newBrand.name || !newBrand.supplier) {
      alert('请填写完整品牌信息');
      return;
    }
    
    const brandToAdd: Brand = {
      id: allBrands.length + 1,
      name: newBrand.name!,
      category: newBrand.category || '其它',
      sub_category: newBrand.sub_category || newBrand.material_type || '其它',
      material_type: newBrand.material_type || newBrand.sub_category || '其它',
      model: newBrand.model || 'N/A',
      price: newBrand.price || 0,
      unit: newBrand.unit || 'm²',
      supplier: newBrand.supplier!,
      rating: 5.0,
      reviews: 0
    };

    setAllBrands([brandToAdd, ...allBrands]);
    setIsAddingBrand(false);
    setNewBrand({
      name: '',
      category: '地板',
      sub_category: '实木地板',
      material_type: '实木地板',
      model: '',
      price: 0,
      supplier: '',
      unit: 'm²'
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    setProgress(10);
    setProgressMessage('正在准备图片数据...');
    
    try {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 85) return prev + Math.random() * 5;
          return prev;
        });
      }, 800);

      setProgressMessage('AI 正在识别空间结构与材料...');
      const availableCategories = ["瓷砖", "卫浴", "地板", "灯具", "涂料", "五金", "家具", "厨电"];
      const prompt = `分析这张建筑装饰图片。识别出图片中的主要装饰材料。
对于每种材料，请尽可能将其归类到以下大类之一：${availableCategories.join('、')}。
如果无法归类到这些大类，请使用最接近的描述。
返回 JSON 格式，包含 hotspots 数组和 materials 数组。
JSON 结构示例：
{ 
  "hotspots": [{ "id": "1", "x": 50, "y": 50, "materialName": "地板", "materialType": "实木地板" }], 
  "materials": [{ "id": 1, "name": "地板", "type": "实木地板", "characteristics": "耐磨,环保", "base_price_min": 100, "base_price_max": 200, "install_price_min": 20, "install_price_max": 40 }] 
}
注意：materialName 应该对应大类名称，materialType 应该对应具体的子类名称。`;
      
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image: selectedImage,
          prompt,
          apiKey: qwenApiKey,
          model: visionModel
        })
      });

      clearInterval(interval);
      setProgress(90);
      setProgressMessage('正在生成概算报告...');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const result = await response.json();
      setAnalysisResult({
        imageUrl: selectedImage,
        hotspots: result.hotspots,
        materials: result.materials
      });
      
      // Initialize budget entries
      const initialBudget = result.materials.map((m: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        materialName: m.name,
        quantity: 0,
        unit: 'm²',
        unitPrice: (m.base_price_min + m.base_price_max) / 2,
        totalPrice: 0
      }));
      setBudgetEntries(initialBudget);
      
      setView('analysis');
    } catch (error) {
      console.error("Analysis failed:", error);
      alert(`分析失败: ${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleMaterialChangeRequest = async () => {
    if (!changeRequest || !selectedImage) return;
    setIsGeneratingImage(true);
    setProgress(10);
    setProgressMessage('正在提交生成任务...');
    setShowChangeModal(false);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image: selectedImage,
          prompt: `建筑装饰效果图修改。原始图片描述：室内空间。用户修改要求：${changeRequest}。请根据要求生成一张高质量的室内装饰效果图。`,
          apiKey: qwenApiKey,
          model: imageModel
        })
      });

      // Note: The backend already polls, so we can't easily show real-time progress from the backend polling here
      // unless we change the architecture to return task ID to client. 
      // For now, we simulate progress during the long wait.
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 90) return prev + 2;
          return prev;
        });
        setProgressMessage(prev => {
          if (progress < 40) return 'AI 正在构思空间布局...';
          if (progress < 70) return '正在渲染材质细节...';
          return '正在进行后期光影优化...';
        });
      }, 1000);

      if (!response.ok) {
        clearInterval(interval);
        const errorData = await response.json();
        throw new Error(errorData.error || "Image generation failed");
      }

      const result = await response.json();
      clearInterval(interval);
      setProgress(95);
      setProgressMessage('正在应用新效果图...');
      const newImageUrl = result.image;

      if (newImageUrl) {
        setSelectedImage(newImageUrl);
        // Re-analyze the new image
        await startAnalysis();
      }
      setProgress(100);
    } catch (error) {
      console.error("Image generation failed:", error);
      alert(`图像生成失败: ${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setIsGeneratingImage(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleRevitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const revitData = results.data as any[];
          const updatedEntries = budgetEntries.map(entry => {
            // Simple matching logic: find a row where the material name is contained in the Revit description
            const match = revitData.find(row => 
              Object.values(row).some(val => 
                typeof val === 'string' && val.toLowerCase().includes(entry.materialName.toLowerCase())
              )
            );
            if (match) {
              const qty = parseFloat(match.Quantity || match.Area || match.Amount || "0");
              return {
                ...entry,
                quantity: qty,
                totalPrice: qty * entry.unitPrice
              };
            }
            return entry;
          });
          setBudgetEntries(updatedEntries);
        }
      });
    }
  };

  const updateBudgetEntry = (id: string, field: keyof BudgetEntry, value: any) => {
    const updated = budgetEntries.map(entry => {
      if (entry.id === id) {
        const newEntry = { ...entry, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          newEntry.totalPrice = newEntry.quantity * newEntry.unitPrice;
        }
        return newEntry;
      }
      return entry;
    });
    setBudgetEntries(updated);
  };

  const totalBudget = budgetEntries.reduce((sum, entry) => sum + entry.totalPrice, 0);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Building2 className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">ArchAnalyze AI 智筑分析</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Professional Budget Suite</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <button onClick={() => setView('dashboard')} className={`transition-colors ${view === 'dashboard' ? 'text-blue-500' : 'text-slate-400 hover:text-white'}`}>仪表盘</button>
            <button onClick={() => setView('analysis')} className={`transition-colors ${view === 'analysis' ? 'text-blue-500' : 'text-slate-400 hover:text-white'}`} disabled={!analysisResult}>分析详情</button>
            <button onClick={() => setView('report')} className={`transition-colors ${view === 'report' ? 'text-blue-500' : 'text-slate-400 hover:text-white'}`} disabled={!analysisResult}>概算报表</button>
          </nav>
          <div className="flex items-center gap-4 relative">
            <div className="relative">
              <button 
                onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)}
                className={`p-2 rounded-full transition-colors ${isSettingsDropdownOpen ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <AnimatePresence>
                {isSettingsDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsSettingsDropdownOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-[70] overflow-hidden"
                    >
                      <div className="p-2 space-y-1">
                        <button 
                          onClick={handleNewProject}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" /> 新建项目
                        </button>
                        <button 
                          onClick={() => { setIsBrandDbOpen(true); setIsSettingsDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Database className="w-4 h-4" /> 品牌数据库
                        </button>
                        <div className="h-px bg-slate-800 my-1" />
                        <button 
                          onClick={() => { setIsAppSettingOpen(true); setIsSettingsDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Settings className="w-4 h-4" /> 设置
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-white/10" />
          </div>
        </div>
      </header>

      <main className={`max-w-[1920px] mx-auto p-6 ${view !== 'dashboard' ? 'pb-40' : ''}`}>
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">项目仪表盘</h2>
                  <p className="text-slate-400 mt-1">上传您的建筑渲染图或草图，AI 将为您生成即时预算分析。</p>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-sm font-bold hover:bg-slate-700 transition-colors">
                    <History className="w-4 h-4" /> 历史记录
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="relative group">
                    <div className={`aspect-[16/9] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-6 overflow-hidden ${selectedImage ? 'border-blue-500/50 bg-slate-900' : 'border-slate-800 bg-slate-900/50 hover:border-blue-500/30'}`}>
                      {selectedImage ? (
                        <>
                          <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <label className="cursor-pointer bg-white text-black px-6 py-2 rounded-full font-bold text-sm hover:scale-105 transition-transform">
                              更换图片
                              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                            </label>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-20 h-20 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-500">
                            <Upload className="w-10 h-10" />
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold">上传渲染图 / 草图</p>
                            <p className="text-slate-500 mt-2">支持 JPEG, PNG, PDF 格式</p>
                          </div>
                          <label className="cursor-pointer bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-500 shadow-xl shadow-blue-600/20 transition-all">
                            选择文件
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={startAnalysis}
                    disabled={!selectedImage || isAnalyzing}
                    className="w-full mt-6 h-16 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 shadow-2xl shadow-blue-600/20 transition-all"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        AI 正在深度分析中...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-6 h-6" />
                        开始 AI 概算分析
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="font-bold text-lg mb-4">最近分析</h3>
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/30 transition-colors cursor-pointer group">
                          <div className="w-16 h-16 rounded-lg bg-slate-700 overflow-hidden shrink-0">
                            <img src={`https://picsum.photos/seed/arch${i}/200/200`} alt="Recent" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">现代简约客厅方案 {i}</p>
                            <p className="text-xs text-slate-500 mt-1">2024-03-10 • 120m²</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-500 transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="font-bold text-lg">专业版功能</h3>
                      <p className="text-blue-100 text-sm mt-2">解锁 Revit 深度集成与多方案对比功能。</p>
                      <button className="mt-4 px-6 py-2 bg-white text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors">立即升级</button>
                    </div>
                    <Building2 className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 rotate-12" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'analysis' && analysisResult && (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Image & Hotspots */}
              <div className="lg:col-span-8 space-y-6">
                <div ref={imageContainerRef} className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 aspect-[16/10]">
                  <img src={analysisResult.imageUrl} alt="Analysis" className="w-full h-full object-cover" />
                  
                  {/* Hotspots */}
                  {analysisResult.hotspots.map(spot => (
                    <button 
                      key={spot.id}
                      onClick={() => setSelectedHotspot(spot)}
                      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 group z-10`}
                    >
                      <span className="relative flex h-8 w-8">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${selectedHotspot?.id === spot.id ? 'bg-blue-400' : 'bg-white'}`}></span>
                        <span className={`relative inline-flex rounded-full h-8 w-8 items-center justify-center shadow-2xl border-2 transition-all ${selectedHotspot?.id === spot.id ? 'bg-blue-600 border-white scale-110' : 'bg-white border-blue-600'}`}>
                          {selectedHotspot?.id === spot.id ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-blue-600" />}
                        </span>
                      </span>
                      <div className={`absolute top-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap transition-all ${selectedHotspot?.id === spot.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0'}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">{spot.materialName}</p>
                      </div>
                    </button>
                  ))}

                  {/* Analysis Overlay */}
                  <div className="absolute bottom-6 left-6 right-6 bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">AI 置信度</span>
                        <span className="text-sm font-bold text-emerald-400">98.2% 准确</span>
                      </div>
                      <div className="w-px h-8 bg-slate-700" />
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">识别项目</span>
                        <span className="text-sm font-bold">{analysisResult.materials.length} 项材料</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowChangeModal(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" /> 变更材质
                      </button>
                      <button 
                        onClick={() => setView('report')}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
                      >
                        <FileText className="w-4 h-4" /> 生成报表
                      </button>
                    </div>
                  </div>

                  {isGeneratingImage && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-50">
                      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                      <p className="text-xl font-bold">正在根据您的要求重新生成效果图...</p>
                    </div>
                  )}
                </div>

                {/* Material Details */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
                  {selectedHotspot ? (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold">{selectedHotspot.materialName}</h3>
                          <p className="text-slate-400 mt-1">类别：<span className="text-blue-400 font-medium">{selectedHotspot.materialType}</span></p>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest border border-blue-500/20">已选中</span>
                        </div>
                      </div>

                      {analysisResult.materials.find(m => m.name === selectedHotspot.materialName) && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                              <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">预估单价</p>
                              <p className="text-lg font-bold text-blue-400">¥{analysisResult.materials.find(m => m.name === selectedHotspot.materialName)?.base_price_min} - ¥{analysisResult.materials.find(m => m.name === selectedHotspot.materialName)?.base_price_max}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                              <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">安装成本</p>
                              <p className="text-lg font-bold">¥{analysisResult.materials.find(m => m.name === selectedHotspot.materialName)?.install_price_min} - ¥{analysisResult.materials.find(m => m.name === selectedHotspot.materialName)?.install_price_max}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                              <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">环保等级</p>
                              <p className="text-lg font-bold">E0 / EN13986</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                              <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">维护周期</p>
                              <p className="text-lg font-bold">3-5 年</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">材料特性</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {analysisResult.materials.find(m => m.name === selectedHotspot.materialName)?.characteristics.split(',').map((char, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                  <span className="text-sm">{char.trim()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-4">
                      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                        <Plus className="w-8 h-8" />
                      </div>
                      <p className="font-medium">点击图片上的热点查看详细材料分析</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Brand Library */}
              <div className="lg:col-span-4 space-y-6">
                <div 
                  className="sticky top-24 flex flex-col gap-6"
                  style={{ height: imageHeight ? `${imageHeight}px` : 'auto' }}
                >
                  <div className="flex-1 overflow-hidden">
                    <BrandLibrary 
                      brands={allBrands}
                      maxHeight={imageHeight ? `${imageHeight - 160}px` : '600px'} 
                      initialCategory={selectedHotspot?.materialType}
                      broadCategory={selectedHotspot?.materialName}
                    />
                  </div>
                  
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shrink-0">
                    <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" /> 附近展厅
                    </h3>
                    <div className="space-y-3">
                      {mockShowrooms.slice(0, 2).map(sr => (
                        <div 
                          key={sr.id} 
                          onClick={() => setSelectedShowroom(sr)}
                          className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/30 transition-all cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{sr.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate">{sr.address}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-blue-400">{sr.distance}</p>
                            <ChevronRight className="w-3 h-3 text-slate-600 ml-auto mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="w-full mt-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
                      查看全部 12 个展厅
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'report' && (
            <motion.div 
              key="report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">概算造价汇总</h2>
                  <p className="text-slate-400 mt-1">基于 AI 分析与品牌库数据的动态预算报表。</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all cursor-pointer shadow-lg shadow-blue-600/20">
                    <FileSpreadsheet className="w-4 h-4" /> 导入 Revit 明细表
                    <input type="file" className="hidden" accept=".csv" onChange={handleRevitUpload} />
                  </label>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition-colors">
                    <Download className="w-4 h-4" /> 导出 PDF 报表
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                      <h3 className="font-bold flex items-center gap-2">
                        <Table className="w-5 h-5 text-blue-500" /> 工程量清单
                      </h3>
                      <span className="text-xs text-slate-500">共 {budgetEntries.length} 项材料</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-800/50 text-[10px] uppercase tracking-widest font-bold text-slate-500 border-b border-slate-800">
                            <th className="px-6 py-4">材料名称</th>
                            <th className="px-6 py-4">工程量</th>
                            <th className="px-6 py-4">单位</th>
                            <th className="px-6 py-4">预估单价 (¥)</th>
                            <th className="px-6 py-4 text-right">合价 (¥)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {budgetEntries.map(entry => (
                            <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-4 font-medium">{entry.materialName}</td>
                              <td className="px-6 py-4">
                                <input 
                                  type="number" 
                                  value={entry.quantity}
                                  onChange={(e) => updateBudgetEntry(entry.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-20 bg-slate-800 border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-6 py-4 text-slate-400 text-sm">{entry.unit}</td>
                              <td className="px-6 py-4">
                                <input 
                                  type="number" 
                                  value={entry.unitPrice}
                                  onChange={(e) => updateBudgetEntry(entry.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-24 bg-slate-800 border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-blue-400">¥{entry.totalPrice.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-800/20">
                            <td colSpan={4} className="px-6 py-6 text-right font-bold text-slate-400 uppercase tracking-widest text-xs">总计概算造价</td>
                            <td className="px-6 py-6 text-right text-2xl font-black text-white">¥{totalBudget.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="font-bold text-lg mb-6">成本构成分析</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={budgetEntries.filter(e => e.totalPrice > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="totalPrice"
                            nameKey="materialName"
                          >
                            {budgetEntries.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                      {budgetEntries.filter(e => e.totalPrice > 0).map((entry, index) => (
                        <div key={entry.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'][index % 5] }} />
                            <span className="text-slate-400">{entry.materialName}</span>
                          </div>
                          <span className="font-bold">{((entry.totalPrice / totalBudget) * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="font-bold text-lg mb-4">预算健康度</h3>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      <div>
                        <p className="text-sm font-bold text-emerald-400">预算在合理区间内</p>
                        <p className="text-[10px] text-slate-500 mt-1">当前造价符合同类项目平均水平。</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Material Change Modal */}
      <AnimatePresence>
        {showChangeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChangeModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
            >
              <button 
                onClick={() => setShowChangeModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-2xl font-bold mb-2">变更材质要求</h3>
              <p className="text-slate-400 text-sm mb-6">告诉 AI 您想如何修改当前的装饰方案，我们将为您生成新的效果图并更新预算。</p>
              
              <div className="space-y-4">
                <textarea 
                  value={changeRequest}
                  onChange={(e) => setChangeRequest(e.target.value)}
                  placeholder="例如：将地板更换为深色胡桃木，墙面增加大理石背景墙..."
                  className="w-full h-32 bg-slate-800 border-slate-700 rounded-2xl p-4 text-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowChangeModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl bg-slate-800 font-bold hover:bg-slate-700 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleMaterialChangeRequest}
                    disabled={!changeRequest}
                    className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> 重新生成
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Brand Database Modal */}
      <AnimatePresence>
        {isBrandDbOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBrandDbOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <Database className="w-6 h-6 text-blue-500" />
                  <h3 className="text-xl font-bold">品牌数据库管理</h3>
                </div>
                <button 
                  onClick={() => setIsBrandDbOpen(false)}
                  className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {isAddingBrand ? (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-4 mb-6">
                    <h4 className="font-bold text-lg">新增品牌信息</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">品牌名称</label>
                        <input 
                          type="text" 
                          value={newBrand.name}
                          onChange={(e) => setNewBrand({...newBrand, name: e.target.value})}
                          className="w-full bg-slate-900 border-slate-700 rounded-lg text-sm"
                          placeholder="例如：泰拉木业"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">大类类别</label>
                        <select 
                          value={newBrand.category}
                          onChange={(e) => setNewBrand({...newBrand, category: e.target.value})}
                          className="w-full bg-slate-900 border-slate-700 rounded-lg text-sm"
                        >
                          <option value="地板">地板</option>
                          <option value="瓷砖">瓷砖</option>
                          <option value="涂料">涂料</option>
                          <option value="卫浴">卫浴</option>
                          <option value="灯具">灯具</option>
                          <option value="五金">五金</option>
                          <option value="家具">家具</option>
                          <option value="厨电">厨电</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">具体品类</label>
                        <input 
                          type="text" 
                          value={newBrand.sub_category}
                          onChange={(e) => setNewBrand({...newBrand, sub_category: e.target.value, material_type: e.target.value})}
                          className="w-full bg-slate-900 border-slate-700 rounded-lg text-sm"
                          placeholder="例如：木纹瓷砖"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">型号规格</label>
                        <input 
                          type="text" 
                          value={newBrand.model}
                          onChange={(e) => setNewBrand({...newBrand, model: e.target.value})}
                          className="w-full bg-slate-900 border-slate-700 rounded-lg text-sm"
                          placeholder="例如：北欧橡木 XL"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">单价 (¥)</label>
                        <input 
                          type="number" 
                          value={newBrand.price}
                          onChange={(e) => setNewBrand({...newBrand, price: parseFloat(e.target.value) || 0})}
                          className="w-full bg-slate-900 border-slate-700 rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">供应商名称</label>
                        <input 
                          type="text" 
                          value={newBrand.supplier}
                          onChange={(e) => setNewBrand({...newBrand, supplier: e.target.value})}
                          className="w-full bg-slate-900 border-slate-700 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => setIsAddingBrand(false)}
                        className="flex-1 py-2 rounded-lg bg-slate-700 font-bold hover:bg-slate-600 transition-colors"
                      >
                        取消
                      </button>
                      <button 
                        onClick={handleSaveBrand}
                        className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors"
                      >
                        保存品牌
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allBrands.map(brand => (
                      <div key={brand.id} className="p-4 rounded-xl border border-slate-800 bg-slate-800/30 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm">{brand.name}</h4>
                            <p className="text-[10px] text-slate-500">{brand.category} · {brand.sub_category} • {brand.model}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">¥{brand.price}/{brand.unit}</p>
                          <p className="text-[10px] text-slate-500">{brand.supplier}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex gap-3">
                <button 
                  onClick={() => setIsAddingBrand(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all"
                >
                  <Plus className="w-4 h-4" /> 新建品牌
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition-colors">
                  <Download className="w-4 h-4" /> 导入数据
                </button>
                <div className="flex-1" />
                <button 
                  onClick={() => setIsBrandDbOpen(false)}
                  className="px-6 py-2 rounded-lg bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition-colors"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* App Settings Modal */}
      <AnimatePresence>
        {isAppSettingOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAppSettingOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-blue-500" />
                  <h3 className="text-xl font-bold">软件设置</h3>
                </div>
                <button 
                  onClick={() => setIsAppSettingOpen(false)}
                  className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">常规设置</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">默认货币</p>
                        <p className="text-[10px] text-slate-500">报表显示的货币单位</p>
                      </div>
                      <select className="bg-slate-800 border-slate-700 rounded-lg text-xs">
                        <option>人民币 (¥)</option>
                        <option>美元 ($)</option>
                        <option>欧元 (€)</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">计量单位</p>
                        <p className="text-[10px] text-slate-500">工程量默认单位</p>
                      </div>
                      <select className="bg-slate-800 border-slate-700 rounded-lg text-xs">
                        <option>平方米 (m²)</option>
                        <option>立方米 (m³)</option>
                        <option>米 (m)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">AI 模型设定</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-bold">视觉模型 (Vision Model)</p>
                      <select 
                        value={visionModel}
                        onChange={(e) => setVisionModel(e.target.value)}
                        className="w-full bg-slate-800 border-slate-700 rounded-lg text-xs p-2"
                      >
                        <option value="qwen3.5-flash">qwen3.5-flash (推荐)</option>
                        <option value="qwen-vl-plus">qwen-vl-plus</option>
                        <option value="qwen-vl-max">qwen-vl-max</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-bold">图像生成模型 (Image Model)</p>
                      <select 
                        value={imageModel}
                        onChange={(e) => setImageModel(e.target.value)}
                        className="w-full bg-slate-800 border-slate-700 rounded-lg text-xs p-2"
                      >
                        <option value="qwen-image-2.0">qwen-image-2.0 (推荐)</option>
                        <option value="qwen-image-v1">qwen-image-v1</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-bold">DashScope API Key</p>
                      <div className="relative">
                        <input 
                          type="password"
                          value={qwenApiKey}
                          onChange={(e) => setQwenApiKey(e.target.value)}
                          placeholder="输入您的 sk-..."
                          className="w-full bg-slate-800 border-slate-700 rounded-lg text-xs p-2 pr-10"
                        />
                        <Key className="absolute right-3 top-2 w-4 h-4 text-slate-500" />
                      </div>
                      <p className="text-[10px] text-slate-500">留空则使用系统默认配置</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-4 text-slate-500">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-[10px]">当前版本: v1.2.4 (Build 20240310)</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-800/30 border-t border-slate-800 flex gap-3">
                <button 
                  onClick={() => {
                    localStorage.setItem('visionModel', visionModel);
                    localStorage.setItem('imageModel', imageModel);
                    localStorage.setItem('qwenApiKey', qwenApiKey);
                    setIsAppSettingOpen(false);
                  }}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                >
                  保存设置
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Stats (Sticky) */}
      {view !== 'dashboard' && (
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 px-6 py-4 z-40">
          <div className="max-w-[1920px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-500">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">当前概算总额</p>
                  <p className="text-lg font-bold">¥{totalBudget.toLocaleString()}</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-600/10 flex items-center justify-center text-amber-500">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">识别材料项</p>
                  <p className="text-lg font-bold">{analysisResult?.materials.length || 0} 项</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setView('report')}
                className="px-6 py-2 rounded-lg bg-slate-800 text-sm font-bold hover:bg-slate-700 transition-colors"
              >
                查看完整报表
              </button>
              <button className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20">
                保存项目
              </button>
            </div>
          </div>
        </footer>
      )}
      <ShowroomMap 
        showroom={selectedShowroom} 
        onClose={() => setSelectedShowroom(null)} 
      />

      {/* Progress Overlay */}
      <AnimatePresence>
        {(isAnalyzing || isGeneratingImage) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl"
          >
            <div className="w-full max-w-md p-8 text-center space-y-8">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full border-4 border-blue-600/20 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-400">{Math.round(progress)}%</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  {isAnalyzing ? 'AI 正在深度分析中' : 'AI 正在生成效果图'}
                </h3>
                <p className="text-slate-400 text-sm animate-pulse">
                  {progressMessage}
                </p>
              </div>

              <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className={`p-3 rounded-xl border transition-all ${progress > 30 ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                  <div className="text-[10px] font-bold uppercase mb-1">空间识别</div>
                  <div className="h-1 w-full bg-current opacity-20 rounded-full" />
                </div>
                <div className={`p-3 rounded-xl border transition-all ${progress > 60 ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                  <div className="text-[10px] font-bold uppercase mb-1">材质分析</div>
                  <div className="h-1 w-full bg-current opacity-20 rounded-full" />
                </div>
                <div className={`p-3 rounded-xl border transition-all ${progress > 90 ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                  <div className="text-[10px] font-bold uppercase mb-1">报告生成</div>
                  <div className="h-1 w-full bg-current opacity-20 rounded-full" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
