import React, { useState, useMemo } from 'react';
import { Search, Star, Building2, MessageSquare, Box, Filter, ChevronRight, AlertCircle, ArrowUpDown, X } from 'lucide-react';
import Fuse from 'fuse.js';
import { Brand } from '../types';
import { mockBrands } from '../data/mockData';

interface BrandLibraryProps {
  brands: Brand[];
  onSelectBrand?: (brand: Brand) => void;
  maxHeight?: string;
  initialCategory?: string | null;
  broadCategory?: string | null;
}

export const BrandLibrary: React.FC<BrandLibraryProps> = ({ 
  brands, 
  onSelectBrand, 
  maxHeight, 
  initialCategory,
  broadCategory 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'rating' | 'price' | 'none'>('none');

  // Sync with initialCategory
  React.useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    } else {
      setSelectedCategory(null);
    }
  }, [initialCategory]);

  const categories = useMemo(() => {
    const cats = new Set(brands.map(b => b.sub_category));
    return Array.from(cats);
  }, [brands]);

  const fuse = useMemo(() => {
    return new Fuse(brands, {
      keys: ['name', 'category', 'sub_category', 'supplier', 'model'],
      threshold: 0.3,
    });
  }, [brands]);

  const filteredBrands = useMemo(() => {
    // If there's a search query, we search across all brands
    let results = searchQuery 
      ? fuse.search(searchQuery).map(r => r.item)
      : brands;

    // Only apply category filter if no search query is present, 
    // OR if the user explicitly selected a category from the list (not just from initialCategory)
    if (selectedCategory && !searchQuery) {
      results = results.filter(b => b.sub_category === selectedCategory);
    }

    if (sortOrder === 'rating') {
      results = [...results].sort((a, b) => b.rating - a.rating);
    } else if (sortOrder === 'price') {
      results = [...results].sort((a, b) => a.price - b.price);
    }

    return results;
  }, [searchQuery, selectedCategory, sortOrder, fuse, brands]);

  const fallbackBrands = useMemo(() => {
    // Fallback logic: if we have a specific category selected but no results, 
    // show brands from the broader category.
    if (filteredBrands.length > 0 || !broadCategory || searchQuery) return [];
    
    // Filter brands that match the broad category
    let results = brands.filter(b => 
      b.category === broadCategory || b.sub_category.includes(broadCategory)
    );

    // If still no results, maybe try fuzzy matching on the broad category
    if (results.length === 0) {
      const broadFuse = new Fuse(brands, { keys: ['category', 'sub_category'], threshold: 0.4 });
      results = broadFuse.search(broadCategory).map(r => r.item);
    }

    if (sortOrder === 'rating') {
      results = [...results].sort((a, b) => b.rating - a.rating);
    } else if (sortOrder === 'price') {
      results = [...results].sort((a, b) => a.price - b.price);
    }

    return results;
  }, [filteredBrands, broadCategory, brands, searchQuery, sortOrder]);

  const isShowingFallback = !searchQuery && filteredBrands.length === 0 && fallbackBrands.length > 0 && selectedCategory === initialCategory;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header & Search */}
      <div className="p-6 border-b border-slate-800 bg-slate-800/30 space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">品牌库推荐</h3>
            <p className="text-xs text-slate-500 mt-1">共收录 {brands.length} 个认证供应商</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if (sortOrder === 'none') setSortOrder('rating');
                else if (sortOrder === 'rating') setSortOrder('price');
                else setSortOrder('none');
              }}
              className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${sortOrder !== 'none' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              title={sortOrder === 'rating' ? '按评分排序' : sortOrder === 'price' ? '按价格排序' : '默认排序'}
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortOrder !== 'none' && <span className="text-[10px] font-bold">{sortOrder === 'rating' ? '评分' : '价格'}</span>}
            </button>
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory(null);
                setSortOrder('none');
              }}
              className="px-3 py-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2"
              title="重置所有过滤器"
            >
              <Filter className="w-4 h-4" />
              <span className="text-[10px] font-bold">重置</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索品牌、材料类型或供应商..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Categories Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${!selectedCategory ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
          >
            全部
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${selectedCategory === cat ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Brand List */}
      <div 
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
        style={{ maxHeight: maxHeight || 'none' }}
      >
        {isShowingFallback && (
          <div className="p-4 rounded-xl bg-amber-600/10 border border-amber-500/30 mb-6">
            <div className="flex items-center gap-3 text-amber-500 mb-2">
              <AlertCircle className="w-4 h-4" />
              <p className="text-xs font-bold">未收藏该品类品牌: {selectedCategory}</p>
            </div>
            <p className="text-[10px] text-slate-400 mb-3">您可以去添加品类品牌，或者查看下方为您推荐的其它相关品牌。</p>
            <div className="flex items-center gap-2 text-blue-400 text-[10px] font-bold">
              <span>为您推荐 {broadCategory} 相关的品牌</span>
              <div className="h-[1px] flex-1 bg-blue-500/20" />
            </div>
          </div>
        )}

        {(filteredBrands.length > 0 || isShowingFallback) ? (
          (isShowingFallback ? fallbackBrands : filteredBrands).map(brand => (
            <div 
              key={brand.id} 
              className="p-4 rounded-xl border border-slate-800 bg-slate-800/30 hover:border-blue-500/30 transition-all group cursor-pointer"
              onClick={() => onSelectBrand?.(brand)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{brand.name}</h4>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-bold text-slate-500">{brand.rating} ({brand.reviews})</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">{brand.category}</span>
                  <span className="text-xs font-bold text-blue-400">{brand.sub_category}</span>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">型号：</span>
                  <span className="font-medium text-slate-300">{brand.model}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">预估单价：</span>
                  <span className="font-bold text-white">¥{brand.price}/{brand.unit}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">供应商：</span>
                  <span className="font-medium text-blue-400 truncate max-w-[150px]">{brand.supplier}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-slate-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-slate-700 transition-colors">查看详情</button>
                <button className="p-2 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-slate-500">
            <Box className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">未找到匹配的品牌</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
              className="mt-4 text-blue-500 text-xs font-bold hover:underline"
            >
              重置搜索条件
            </button>
          </div>
        )}
      </div>

      {/* Footer / Showroom Link */}
      <div className="p-4 bg-slate-800/50 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-blue-500/30 transition-all cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold">申请实物小样</p>
            <p className="text-[10px] text-slate-500">免费配送至您的工作室</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
        </div>
      </div>
    </div>
  );
};
