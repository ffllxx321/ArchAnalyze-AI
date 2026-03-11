import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Phone, Navigation, Info } from 'lucide-react';
import { Showroom } from '../types';

interface ShowroomMapProps {
  showroom: Showroom | null;
  onClose: () => void;
}

export const ShowroomMap: React.FC<ShowroomMapProps> = ({ showroom, onClose }) => {
  if (!showroom) return null;

  // Mock markers for the map
  const nearbyMarkers = [
    { id: 1, x: 40, y: 30, name: '当前位置' },
    { id: 2, x: 60, y: 50, name: showroom.name },
    { id: 3, x: 20, y: 70, name: '备选展厅 A' },
    { id: 4, x: 80, y: 20, name: '备选展厅 B' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Map Section (Upper) */}
          <div className="relative h-80 bg-slate-800 overflow-hidden">
            {/* Simulated Grid Map */}
            <div className="absolute inset-0 opacity-20" 
              style={{ 
                backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', 
                backgroundSize: '30px 30px' 
              }} 
            />
            
            {/* Simulated Roads */}
            <div className="absolute top-1/2 left-0 w-full h-4 bg-slate-700/50 -translate-y-1/2" />
            <div className="absolute top-0 left-1/3 w-4 h-full bg-slate-700/50" />
            
            {/* Markers */}
            {nearbyMarkers.map((marker) => (
              <motion.div
                key={marker.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + marker.id * 0.1 }}
                style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
              >
                <div className={`relative flex items-center justify-center ${marker.id === 2 ? 'text-blue-500' : marker.id === 1 ? 'text-emerald-500' : 'text-slate-500'}`}>
                  <MapPin className={`w-8 h-8 ${marker.id === 2 ? 'animate-bounce' : ''}`} fill="currentColor" fillOpacity={0.2} />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-slate-950 text-white text-[10px] font-bold py-1 px-2 rounded border border-slate-700 whitespace-nowrap">
                      {marker.name}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button onClick={onClose} className="p-2 bg-slate-950/50 hover:bg-slate-950 rounded-full text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-slate-400 flex items-center gap-2">
              <Info className="w-3 h-3" />
              <span>模拟地图定位数据</span>
            </div>
          </div>

          {/* Details Section (Lower) */}
          <div className="p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">{showroom.name}</h3>
                <p className="text-slate-400 mt-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  {showroom.address}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                  距离 {showroom.distance}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold">联系电话</p>
                  <p className="text-sm font-bold">{showroom.phone}</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-500">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold">导航前往</p>
                  <p className="text-sm font-bold">开启地图导航</p>
                </div>
              </div>
            </div>

            <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transition-all">
              预约实物打样
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
