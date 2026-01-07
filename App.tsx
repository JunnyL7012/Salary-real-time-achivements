
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Wish, WorkConfig, Statistics, TimeRange } from './types';
import { Plus, Trash2, Play, Square, Settings2, Wallet, ReceiptText, ChevronRight, TrendingUp, Coins } from 'lucide-react';

const FallingCoins: React.FC<{ active: boolean }> = ({ active }) => {
  const [coins, setCoins] = useState<{ id: number; left: string; delay: string; duration: string; size: string }[]>([]);

  useEffect(() => {
    const initialCoins = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 90}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 3}s`,
      size: `${12 + Math.random() * 8}px`
    }));
    setCoins(initialCoins);
  }, []);

  return (
    <div className="relative w-full h-24 overflow-hidden mt-2 bg-slate-50/50 rounded-lg border border-dotted border-slate-200">
      {/* Background Text - placed at the bottom layer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <p className="text-[10px] text-slate-300 font-mono tracking-widest uppercase select-none">
          {active ? 'Coins are falling!' : 'Hard work pays off'}
        </p>
      </div>
      
      {/* Foreground Coins - z-10 to stay above text */}
      <div className="relative z-10 w-full h-full">
        {coins.map((coin) => (
          <div
            key={coin.id}
            className={`coin-particle flex items-center justify-center text-yellow-500 transition-opacity duration-1000 ${active ? 'opacity-100' : 'opacity-20'}`}
            style={{
              '--left': coin.left,
              '--delay': coin.delay,
              '--duration': active ? '2s' : coin.duration,
              fontSize: coin.size,
            } as React.CSSProperties}
          >
            {Math.random() > 0.5 ? '🪙' : '💰'}
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [config, setConfig] = useState<WorkConfig>({
    annualSalary: 300000,
    daysPerYear: 250,
    hoursPerDay: 8,
  });

  const [isWorking, setIsWorking] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentSessionEarnings, setCurrentSessionEarnings] = useState(0);

  const [wishes, setWishes] = useState<Wish[]>([
    { id: '1', name: '新款 iPhone', price: 8999, progress: 0, completed: false },
    { id: '2', name: '日本五日游', price: 15000, progress: 0, completed: false }
  ]);
  
  const [stats, setStats] = useState<Statistics>({
    totalEarnedToday: 0,
    totalEarnedThisWeek: 0,
    totalEarnedThisMonth: 0,
    totalSavings: 0,
    savingsGoal: 50000
  });

  const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.WEEK);
  const [showSettings, setShowSettings] = useState(false);
  const timerRef = useRef<number | null>(null);

  const dailyTarget = config.annualSalary / config.daysPerYear;
  const estimatedSecondRate = dailyTarget / (config.hoursPerDay * 3600);

  const handleStartWork = () => {
    setIsWorking(true);
    setStartTime(Date.now());
    setElapsedSeconds(0);
    setCurrentSessionEarnings(0);
  };

  const handleEndWork = () => {
    if (!startTime) return;
    setIsWorking(false);
    
    // Finalize the day with the daily target amount
    const amountToDistribute = dailyTarget;

    setStats(prev => ({
      ...prev,
      totalEarnedToday: prev.totalEarnedToday + amountToDistribute,
      totalEarnedThisWeek: prev.totalEarnedThisWeek + amountToDistribute,
      totalEarnedThisMonth: prev.totalEarnedThisMonth + amountToDistribute,
    }));

    setWishes(prevWishes => {
      const newWishes = [...prevWishes];
      let remaining = amountToDistribute;

      for (let i = 0; i < newWishes.length; i++) {
        if (remaining <= 0) break;
        if (newWishes[i].completed) continue;

        const alreadyPaid = newWishes[i].price * (newWishes[i].progress / 100);
        const needed = newWishes[i].price - alreadyPaid;

        if (remaining >= needed) {
          remaining -= needed;
          newWishes[i].progress = 100;
          newWishes[i].completed = true;
        } else {
          newWishes[i].progress = ((alreadyPaid + remaining) / newWishes[i].price) * 100;
          remaining = 0;
        }
      }
      
      if (remaining > 0) {
        setStats(prev => ({ ...prev, totalSavings: prev.totalSavings + remaining }));
      }
      return newWishes;
    });
    
    setStartTime(null);
    setElapsedSeconds(0);
    setCurrentSessionEarnings(0);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const addWish = (name: string, price: number) => {
    setWishes([...wishes, { id: Date.now().toString(), name, price, progress: 0, completed: false }]);
  };

  const removeWish = (id: string) => {
    setWishes(wishes.filter(w => w.id !== id));
  };

  useEffect(() => {
    if (isWorking) {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
        setCurrentSessionEarnings(prev => prev + estimatedSecondRate);
      }, 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [isWorking, estimatedSecondRate]);

  const formatCurrency = (val: number) => val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Logic to determine which wish or savings is currently being funded LIVE
  const liveTargetData = useMemo(() => {
    let sessionRemaining = currentSessionEarnings;
    const resultWishes = wishes.map(w => ({ ...w }));
    let activeTargetId: string | null = null;
    let liveSavingsSurplus = 0;

    for (let i = 0; i < resultWishes.length; i++) {
      if (resultWishes[i].completed) continue;
      
      const alreadyPaid = resultWishes[i].price * (resultWishes[i].progress / 100);
      const needed = resultWishes[i].price - alreadyPaid;

      if (activeTargetId === null) activeTargetId = resultWishes[i].id;

      if (sessionRemaining >= needed) {
        sessionRemaining -= needed;
        resultWishes[i].progress = 100;
      } else {
        resultWishes[i].progress = ((alreadyPaid + sessionRemaining) / resultWishes[i].price) * 100;
        sessionRemaining = 0;
        break; // Current session funds exhausted
      }
    }

    if (sessionRemaining > 0) {
      liveSavingsSurplus = sessionRemaining;
      activeTargetId = 'SAVINGS';
    }

    const currentActiveWish = resultWishes.find(w => w.id === activeTargetId);
    
    return {
      updatedWishes: resultWishes,
      activeTargetId,
      currentActiveWish,
      liveSavingsSurplus
    };
  }, [wishes, currentSessionEarnings]);

  const displayTotalToday = stats.totalEarnedToday + currentSessionEarnings;
  const displayTotalThisWeek = stats.totalEarnedThisWeek + currentSessionEarnings;
  const displayTotalThisMonth = stats.totalEarnedThisMonth + currentSessionEarnings;
  
  const realTimeTotalSavings = stats.totalSavings + liveTargetData.liveSavingsSurplus;
  const savingsProgressPercent = stats.savingsGoal ? (realTimeTotalSavings / stats.savingsGoal * 100) : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="receipt-paper w-full max-w-md p-6 pb-12 thermal-print">
        <div className="jagged-top"></div>
        <div className="jagged-bottom"></div>

        <div className="text-center mb-6 space-y-1">
          <div className="flex justify-center mb-2">
            <ReceiptText className="w-10 h-10 text-slate-800" />
          </div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase">Salary Receipt</h1>
          <p className="text-xs text-slate-500 uppercase">Personal Ledger v1.3</p>
          <p className="text-xs text-slate-500">{new Date().toLocaleString()}</p>
        </div>

        <div className="border-t border-dashed border-slate-300 my-4"></div>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">今日工作时长</p>
              <p className="text-2xl font-bold font-mono">{formatTime(elapsedSeconds)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold text-slate-800 underline">实时赚取</p>
              <p className="text-3xl font-bold font-mono text-green-700">¥{formatCurrency(currentSessionEarnings)}</p>
            </div>
          </div>

          <button
            onClick={isWorking ? handleEndWork : handleStartWork}
            className={`w-full py-4 px-4 flex items-center justify-center gap-2 border-2 ${
              isWorking 
                ? 'border-red-600 text-red-600 bg-red-50 hover:bg-red-100' 
                : 'border-slate-800 text-slate-800 bg-white hover:bg-slate-50'
            } transition-all duration-300 font-bold uppercase tracking-widest text-sm shadow-sm active:translate-y-0.5 rounded`}
          >
            {isWorking ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            {isWorking ? '结束当日工作' : '开始当日工作'}
          </button>
        </div>

        <div className="border-t border-dashed border-slate-300 my-4"></div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <Wallet className="w-3 h-3" /> 目标进度
            </h2>
            <button onClick={() => setShowSettings(!showSettings)} className="text-slate-400 hover:text-slate-800 transition-colors">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>

          {liveTargetData.currentActiveWish && (
            <div className="bg-slate-50 p-4 border border-slate-200 mb-2 relative rounded shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[10px] uppercase text-slate-500">当前追逐：</p>
                  <p className="font-bold text-sm tracking-tight">{liveTargetData.currentActiveWish.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-slate-500">单价</p>
                  <p className="font-bold text-sm">¥{formatCurrency(liveTargetData.currentActiveWish.price)}</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 uppercase font-mono">
                  <span>实时进度</span>
                  <span>{liveTargetData.currentActiveWish.progress.toFixed(2)}%</span>
                </div>
                <div className="h-2.5 bg-slate-200 w-full overflow-hidden rounded-full">
                  <div 
                    className={`h-full bg-slate-800 transition-all duration-300 ease-out ${isWorking ? 'animate-pulse' : ''}`} 
                    style={{ width: `${liveTargetData.currentActiveWish.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div className={`p-4 border border-dashed border-slate-300 rounded transition-colors duration-500 ${liveTargetData.activeTargetId === 'SAVINGS' ? 'bg-green-50/50 border-green-200' : 'bg-slate-50/50'}`}>
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] uppercase text-slate-500 flex items-center gap-1 font-bold">
                <TrendingUp className="w-3 h-3" /> 
                {liveTargetData.activeTargetId === 'SAVINGS' ? '聚焦：累计储蓄模式' : '未来储备'}
              </p>
              {liveTargetData.activeTargetId === 'SAVINGS' && isWorking && <span className="text-[8px] text-green-600 animate-pulse font-bold tracking-tighter">SAVING LIVE</span>}
            </div>
            
            <div className="flex justify-between items-end mb-2">
              <span className="font-bold text-xs uppercase text-slate-600">储蓄总额</span>
              <span className="font-bold font-mono text-lg text-slate-800">¥{formatCurrency(realTimeTotalSavings)}</span>
            </div>

            {stats.savingsGoal ? (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 uppercase font-mono">
                  <span>目标: ¥{formatCurrency(stats.savingsGoal)}</span>
                  <span className={savingsProgressPercent > 100 ? 'text-green-600 font-bold' : ''}>
                    {savingsProgressPercent.toFixed(2)}%
                  </span>
                </div>
                <div className="h-2.5 bg-slate-200 w-full overflow-hidden rounded-full relative">
                  <div 
                    className={`h-full ${savingsProgressPercent > 100 ? 'bg-green-600' : 'bg-slate-500'} transition-all duration-300 ease-out`} 
                    style={{ width: `${Math.min(100, savingsProgressPercent)}%` }}
                  ></div>
                  {savingsProgressPercent > 100 && (
                    <div className="absolute top-0 left-0 w-full h-full bg-green-400/20 animate-pulse"></div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic">未设具体储蓄目标</p>
            )}
          </div>
        </div>

        <div className="mb-6 space-y-3 pt-2">
          <div className="flex justify-between items-center text-xs uppercase text-slate-500 border-b border-dotted border-slate-200 pb-1">
            <span>本日累计总计</span>
            <span className="font-mono text-slate-900 font-bold">¥{formatCurrency(displayTotalToday)}</span>
          </div>
          <div className="flex justify-between items-center text-xs uppercase text-slate-500 border-b border-dotted border-slate-200 pb-1">
            <div className="flex items-center gap-1 cursor-pointer hover:text-slate-800 transition-colors" onClick={() => setTimeRange(timeRange === TimeRange.WEEK ? TimeRange.MONTH : TimeRange.WEEK)}>
              <span className="underline decoration-slate-300 underline-offset-4">{timeRange}累计总计</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </div>
            <span className="font-mono text-slate-900 font-bold">
              ¥{formatCurrency(timeRange === TimeRange.WEEK ? displayTotalThisWeek : displayTotalThisMonth)}
            </span>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-300 my-4"></div>

        {showSettings && (
          <div className="bg-slate-100 p-4 border border-slate-300 mb-6 space-y-4 text-xs animate-in fade-in slide-in-from-top-2 duration-300 rounded shadow-inner">
            <div>
              <p className="font-bold uppercase mb-2 flex items-center gap-1 text-slate-700">配置参数</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-500 uppercase">预设年薪</label>
                  <input type="number" value={config.annualSalary} onChange={e => setConfig({...config, annualSalary: Number(e.target.value)})} className="w-full bg-white border border-slate-300 p-2 font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-500 uppercase">储蓄目标 (0取消)</label>
                  <input type="number" value={stats.savingsGoal || ''} onChange={e => setStats({...stats, savingsGoal: Number(e.target.value) || null})} className="w-full bg-white border border-slate-300 p-2 font-mono" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <p className="font-bold uppercase mb-2 flex items-center gap-1 text-slate-700">追加清单</p>
              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const name = (form.elements.namedItem('wishName') as HTMLInputElement).value;
                const price = Number((form.elements.namedItem('wishPrice') as HTMLInputElement).value);
                if (name && price > 0) { addWish(name, price); form.reset(); }
              }} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input name="wishName" placeholder="愿望名称..." className="bg-white border border-slate-300 p-2 flex-1" required />
                  <input name="wishPrice" type="number" placeholder="价格" className="bg-white border border-slate-300 p-2 w-24 font-mono" required />
                </div>
                <button type="submit" className="bg-slate-800 text-white p-2 font-bold uppercase tracking-widest hover:bg-slate-700 active:bg-slate-900 transition-colors">确认添加 +</button>
              </form>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <p className="font-bold uppercase mb-2 flex items-center gap-1 text-slate-700">清单详情</p>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {wishes.map((wish, idx) => (
                  <div key={wish.id} className="flex justify-between items-center p-2 bg-white border border-slate-200 rounded shadow-sm">
                    <div className="flex flex-col">
                      <span className={`font-bold ${wish.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{idx + 1}. {wish.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">¥{formatCurrency(wish.price)}</span>
                    </div>
                    <button onClick={() => removeWish(wish.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-slate-100 pt-6">
          <FallingCoins active={isWorking} />
          <div className="text-center mt-2">
            <p className="text-[10px] text-slate-400 font-mono tracking-[0.2em] uppercase">每一秒都在创造价值</p>
            <p className="text-[8px] text-slate-300 font-mono uppercase">POS-ID: REC-{Date.now().toString().slice(-6)}</p>
          </div>
          <div className="flex items-center gap-2 text-slate-100">
             <Coins className="w-4 h-4" />
             <div className="h-px w-12 bg-slate-100"></div>
             <Coins className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
