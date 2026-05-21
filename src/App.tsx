import React, { useEffect, useMemo, useState } from 'react';
import { Book, Edit, Settings, X } from 'lucide-react';
import { decodeYDK, ParsedDeck } from './utils/ydkDecoder';

export type LangPref = 'auto' | 'zh' | 'en';

// YGOPRODeck API types
interface CardData {
  id: number;
  name: string;
  en_name?: string;
  type: string;
  desc: string;
  en_desc?: string;
  atk?: number | string;
  def?: number | string;
  level?: number;
  attribute?: string;
  race?: string;
  linkval?: number;
  banlist_info?: {
    ban_tcg?: string;
    ban_ocg?: string;
    ban_goat?: string;
  };
}

const raceDict: Record<string, string> = {
  "Continuous": "永續", "Equip": "裝備", "Field": "場地", "Normal": "通常", "Quick-Play": "速攻", "Ritual": "儀式", "Counter": "反擊",
  "Aqua": "水", "Beast": "獸", "Beast-Warrior": "獸戰士", "Creator-God": "創造神", "Cyberse": "電子界", "Dinosaur": "恐龍", "Divine-Beast": "幻神獸",
  "Dragon": "龍", "Fairy": "天使", "Fiend": "惡魔", "Fish": "魚", "Insect": "昆蟲", "Illusion": "幻想魔", "Machine": "機械", "Plant": "植物",
  "Psychic": "超能", "Pyro": "炎", "Reptile": "爬蟲類", "Rock": "岩石", "Sea Serpent": "海龍", "Spellcaster": "魔法使", "Thunder": "雷",
  "Warrior": "戰士", "Winged Beast": "鳥獸", "Wyrm": "幻龍", "Zombie": "不死", "Illusionist": "幻想魔", "Spell": "魔法", "Trap": "陷阱"
};

const typeDict: Record<string, string> = {
  "Normal": "通常", "Effect": "效果", "Ritual": "儀式", "Fusion": "融合", "Synchro": "同步", "XYZ": "超量", "Link": "連結", "Pendulum": "擺盪", "Token": "衍生物", "Tuner": "協調", "Toon": "卡通", "Union": "聯合", "Spirit": "靈魂", "Gemini": "二重", "Flip": "反轉"
};

const attrMap: Record<string, { char: string, bg: string, ring: string }> = {
  "FIRE": { char: "炎", bg: "bg-gradient-to-br from-red-500 to-red-800", ring: "ring-red-400" },
  "WATER": { char: "水", bg: "bg-gradient-to-br from-blue-400 to-blue-700", ring: "ring-blue-300" },
  "WIND": { char: "風", bg: "bg-gradient-to-br from-green-400 to-green-700", ring: "ring-green-300" },
  "EARTH": { char: "地", bg: "bg-gradient-to-br from-amber-700 to-amber-900 border-gray-400", ring: "ring-amber-500" },
  "LIGHT": { char: "光", bg: "bg-gradient-to-br from-yellow-100 to-yellow-500 text-black", ring: "ring-yellow-200" },
  "DARK": { char: "闇", bg: "bg-gradient-to-br from-purple-700 to-black", ring: "ring-purple-500" },
  "DIVINE": { char: "神", bg: "bg-gradient-to-br from-yellow-400 to-yellow-700", ring: "ring-yellow-300" },
};

const DEFAULT_TEST_STRING = "GKBM-Na8YRchNkyOltQll9qBG7_qDBzWE-LacN4jr0ssqV4vrxbaWbE02cif3pieKGYeRL0bsJXV9PtnS40h9Fyx8KvICoawKWAWn0_uNi2ugkz-SWrevmGB_K1kJqrfpmNqaNi6rrTfjWXIauueZtBa6-sj3F9ZHusm50ZA";

export default function App() {
  const [deck, setDeck] = useState<ParsedDeck>({ main: [], extra: [], side: [] });
  const [deckName, setDeckName] = useState("讀取中...");
  const [cardDb, setCardDb] = useState<Record<number, CardData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  const [imgLangPref, setImgLangPref] = useState<LangPref>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('imgLangPref') as LangPref) || 'zh';
    return 'zh';
  });
  const [textLangPref, setTextLangPref] = useState<LangPref>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('textLangPref') as LangPref) || 'zh';
    return 'zh';
  });
  const [pageLangPref, setPageLangPref] = useState<LangPref>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('pageLangPref') as LangPref) || 'zh';
    return 'zh';
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { localStorage.setItem('imgLangPref', imgLangPref); }, [imgLangPref]);
  useEffect(() => { localStorage.setItem('textLangPref', textLangPref); }, [textLangPref]);
  useEffect(() => { localStorage.setItem('pageLangPref', pageLangPref); }, [pageLangPref]);

  const isAutoChinese = useMemo(() => navigator.language.startsWith('zh'), []);

  // Parse location or fallback to default Darklord string
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const v = searchParams.get('v');
      const d = searchParams.get('d');
      const paramName = searchParams.get('name');
      
      let parsedDeck: ParsedDeck = { main: [], extra: [], side: [] };

      // If no valid param is provided, forcefully use the test string
      if (!d || v !== '1') {
        parsedDeck = decodeYDK(DEFAULT_TEST_STRING);
        setDeckName(paramName || "墮天使"); // Default test deck name if empty
      } else {
        parsedDeck = decodeYDK(d);
        setDeckName(paramName || "解析出的卡組");
      }
      
      setDeck(parsedDeck);
      fetchCardMetaData(parsedDeck);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  }, []);

  const fetchCardMetaData = async (parsedDeck: ParsedDeck) => {
    setIsLoading(true);
    const allIds = [...parsedDeck.main, ...parsedDeck.extra, ...parsedDeck.side];
    const uniqueIds = Array.from(new Set(allIds));
    
    if (uniqueIds.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      const newCardDb: Record<number, CardData> = {};
      const batchSize = 10;
      
      for (let i = 0; i < uniqueIds.length; i += batchSize) {
        const chunk = uniqueIds.slice(i, i + batchSize);
        await Promise.all(chunk.map(async id => {
          try {
            let currentId = id;
            let result = null;
            let attempts = 0;
            // 退一步的方式找到正確卡片 (step back to find correct id for alt arts)
            while (attempts < 5) {
              const res = await fetch(`https://ygocdb.com/api/v0/?search=${currentId}`);
              const json = await res.json();
              if (json.result && json.result.length > 0) {
                result = json.result.find((r: any) => r.id === currentId || r.artid === currentId);
                if (!result && json.result.length === 1) result = json.result[0];
                if (result) break;
              }
              currentId--;
              attempts++;
            }

            if (result) {
              const text = result.text || {};
              const typesText = text.types || "";
              let typeParts: string[] = [];
              let race, attribute, atk, def, level, linkval;

              const lines = typesText.split('\n');
              if (lines.length > 0) {
                const matchType = lines[0].match(/\[(.*?)\]/);
                if (matchType) typeParts = matchType[1].split('|');
                
                const matchRaceAttr = lines[0].match(/\]\s*(.*)\/(.*)/);
                if (matchRaceAttr) {
                  race = matchRaceAttr[1].trim();
                  attribute = matchRaceAttr[2].trim();
                }
              }

              if (lines.length > 1) {
                const matchStats = lines[1].match(/\[(.*?)\]\s*(.*)/);
                if (matchStats) {
                  const lvStr = matchStats[1];
                  if (lvStr.includes('LINK-')) {
                    linkval = parseInt(lvStr.replace('LINK-', ''));
                  } else {
                    level = parseInt(lvStr.replace(/[^0-9]/g, ''));
                  }
                  
                  const statsStr = matchStats[2].split('/');
                  if (statsStr.length === 2) {
                    atk = statsStr[0].trim();
                    def = statsStr[1].trim();
                  }
                }
              }

              let engType = "";
              if (typeParts.includes("怪兽")) engType += "Monster ";
              if (typeParts.includes("效果")) engType += "Effect ";
              if (typeParts.includes("通常")) engType += "Normal ";
              if (typeParts.includes("融合")) engType += "Fusion ";
              if (typeParts.includes("同调")) engType += "Synchro ";
              if (typeParts.includes("超量") || typeParts.includes("XYZ")) engType += "XYZ ";
              if (typeParts.includes("连接") || typeParts.includes("Link")) engType += "Link ";
              if (typeParts.includes("仪式")) engType += "Ritual ";
              if (typeParts.includes("灵摆")) engType += "Pendulum ";
              if (typeParts.includes("调整")) engType += "Tuner ";
              if (typeParts.includes("卡通")) engType += "Toon ";
              if (typeParts.includes("二重")) engType += "Gemini ";
              if (typeParts.includes("灵魂")) engType += "Spirit ";
              if (typeParts.includes("同盟")) engType += "Union ";
              if (typeParts.includes("反转")) engType += "Flip ";
              if (typeParts.includes("衍生物")) engType += "Token ";
              if (typeParts.includes("魔法")) engType += "Spell ";
              if (typeParts.includes("陷阱")) engType += "Trap ";

              let engAttr = attribute;
              if (attribute === "地") engAttr = "EARTH";
              if (attribute === "水") engAttr = "WATER";
              if (attribute === "炎") engAttr = "FIRE";
              if (attribute === "风") engAttr = "WIND";
              if (attribute === "光") engAttr = "LIGHT";
              if (attribute === "暗") engAttr = "DARK";
              if (attribute === "神") engAttr = "DIVINE";

              newCardDb[id] = {
                id: id,
                name: result.md_name || result.cn_name || result.jp_name || "未知卡片",
                en_name: result.en_name,
                type: engType.trim() || typeParts.join(' '),
                desc: text.desc || "",
                atk: atk && atk !== '-' ? atk : undefined,
                def: def && def !== '-' ? def : undefined,
                level,
                linkval,
                race,
                attribute: engAttr
              };
            }
          } catch(e) {
            console.error(`Failed to fetch card ${id}`, e);
          }
        }));
      }
      setCardDb(newCardDb);
    } catch (error) {
      console.error("Failed to fetch card info. Basic IDs will still display.", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const preferEnglishText = textLangPref === 'en' || (textLangPref === 'auto' && !isAutoChinese);
    if (preferEnglishText && selectedCardId && cardDb[selectedCardId] && !cardDb[selectedCardId].en_desc) {
      const enName = cardDb[selectedCardId].en_name;
      // YGOPRODeck handles names more reliably for alternate arts than their single IDs
      const idStr = enName ? `name=${encodeURIComponent(enName)}` : `id=${selectedCardId}`;
      fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?${idStr}`)
        .then(res => res.json())
        .then(json => {
           if (json.data && json.data.length > 0) {
              setCardDb(prev => ({
                ...prev,
                [selectedCardId]: {
                  ...prev[selectedCardId],
                  en_desc: json.data[0].desc
                }
              }));
           } else {
             // Fallback if not found
             setCardDb(prev => ({
                ...prev,
                [selectedCardId]: {
                  ...prev[selectedCardId],
                  en_desc: prev[selectedCardId].desc // If English not found, just put Chinese to stop refetching
                }
              }));
           }
        })
        .catch(err => {
            console.error("Failed to fetch EN card details", err);
            // set dummy desc to prevent retry loop
            setCardDb(prev => ({
                ...prev,
                [selectedCardId]: {
                  ...prev[selectedCardId],
                  en_desc: prev[selectedCardId].desc
                }
            }));
        });
    }
  }, [selectedCardId, textLangPref, isAutoChinese, cardDb]);

  const preferChinesePage = pageLangPref === 'zh' || (pageLangPref === 'auto' && isAutoChinese);

  return (
    <div className="h-screen bg-gradient-to-br from-[#0B1017] via-[#0E151F] to-[#0D121B] text-slate-200 font-sans flex flex-col overflow-hidden selection:bg-slate-700">
      <div className="flex-1 w-full max-w-[1400px] mx-auto p-2 md:p-4 flex flex-col md:flex-row gap-4 h-full min-h-0 relative z-10">
        {/* Left Panel */}
        <div className="w-full md:w-[340px] shrink-0 h-[45vh] md:h-full overflow-hidden">
          <CardDetailsPanel id={selectedCardId} data={selectedCardId ? cardDb[selectedCardId] : undefined} imgLangPref={imgLangPref} textLangPref={textLangPref} pageLangPref={pageLangPref} />
        </div>

        {/* Right Panel - Deck List */}
        <div className="flex-1 w-full flex flex-col min-h-0 border border-[#3E4F63] rounded shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden bg-[#10141A]">
        
        {/* Header Bar */}
        <div className="shrink-0 flex justify-between items-center bg-gradient-to-b from-[#2B3542] to-[#1C232E] border-b border-[#0A0D11] px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center bg-gradient-to-t from-purple-900 to-indigo-700 w-10 h-10 border border-[#526379] rounded shadow-inner rotate-3">
              <Book className="w-5 h-5 text-indigo-100 -rotate-3" />
            </div>
            <h1 className="text-xl font-bold tracking-widest drop-shadow text-gray-100">
              {deckName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(true)} className="flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-300 w-10 h-10 rounded border border-gray-400 hover:brightness-110 active:brightness-95 transition-all text-slate-900 clip-slanted" title={preferChinesePage ? '設定' : 'Settings'}>
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={() => {
              const input = window.prompt(preferChinesePage ? "請輸入 ydke:// 卡組碼" : "Please paste a ydke:// deck code");
              if (input && input.startsWith("ydke://")) {
                const url = new URL(window.location.href);
                url.searchParams.set("d", input);
                url.searchParams.set("v", "1");
                url.searchParams.set("name", preferChinesePage ? "載入的卡組" : "Loaded Deck");
                window.location.href = url.toString();
              } else if (input) {
                alert(preferChinesePage ? "無效的卡組碼，請確保以 ydke:// 開頭" : "Invalid deck code, please make sure it starts with ydke://");
              }
            }} className="flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-300 w-10 h-10 rounded border border-gray-400 hover:brightness-110 active:brightness-95 transition-all text-slate-900 clip-slanted" title={preferChinesePage ? '讀取卡組' : 'Load Deck'}>
              <Edit className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Wrapper */}
        <div className="flex-1 overflow-y-auto p-1 md:p-2 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] fancy-scrollbar">
          
          {/* Main Deck Container */}
          <DeckSection 
            title={preferChinesePage ? "主牌組" : "Main Deck"} 
            type="main" 
            cards={deck.main} 
            db={cardDb} 
            onSelectCard={setSelectedCardId}
            selectedCardId={selectedCardId}
            imgLangPref={imgLangPref}
            pageLangPref={pageLangPref}
          />

          {/* Extra Deck Container */}
          <DeckSection 
            title={preferChinesePage ? "額外牌組" : "Extra Deck"} 
            type="extra" 
            cards={deck.extra} 
            db={cardDb} 
            className="mt-2"
            onSelectCard={setSelectedCardId}
            selectedCardId={selectedCardId}
            imgLangPref={imgLangPref}
            pageLangPref={pageLangPref}
          />

          {/* Side Deck Container */}
          <DeckSection 
            title={preferChinesePage ? "副牌組" : "Side Deck"} 
            type="side" 
            cards={deck.side} 
            db={cardDb} 
            className="mt-2"
            onSelectCard={setSelectedCardId}
            selectedCardId={selectedCardId}
            imgLangPref={imgLangPref}
            pageLangPref={pageLangPref}
          />
          
        </div>
      </div>
      </div>
      
      {/* Footer Instructions Compliance */}
      <footer className="shrink-0 text-center py-2 border-t border-[#1C232E]/60 text-[#718096] text-xs tracking-wide">
        於頁尾標註 <a href="https://barian.moe" target="_blank" rel="noopener noreferrer" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors underline-offset-4 hover:underline">幽影櫻</a> 製作
      </footer>
      
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#10141A] border border-[#3E4F63] rounded shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-b from-[#2B3542] to-[#1C232E] border-b border-[#0A0D11] px-4 py-3 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-100 tracking-wide">設定 / Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">卡圖語言 Image Language</label>
                <div className="flex gap-2 bg-[#1A222D] p-1 rounded border border-[#2A3544]">
                   {(['auto', 'zh', 'en'] as const).map(v => (
                     <button 
                       key={v}
                       onClick={() => setImgLangPref(v)}
                       className={`flex-1 py-1.5 text-sm rounded transition-colors ${imgLangPref === v ? 'bg-[#3E4F63] text-white shadow font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-[#2C3B4E]'}`}
                     >
                       {v === 'auto' ? '自動 Auto' : v === 'zh' ? '中文' : 'English'}
                     </button>
                   ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">卡片內文 Card Text Language</label>
                <div className="flex gap-2 bg-[#1A222D] p-1 rounded border border-[#2A3544]">
                   {(['auto', 'zh', 'en'] as const).map(v => (
                     <button 
                       key={v}
                       onClick={() => setTextLangPref(v)}
                       className={`flex-1 py-1.5 text-sm rounded transition-colors ${textLangPref === v ? 'bg-[#3E4F63] text-white shadow font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-[#2C3B4E]'}`}
                     >
                       {v === 'auto' ? '自動 Auto' : v === 'zh' ? '中文' : 'English'}
                     </button>
                   ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">頁面介面 Page UI Language</label>
                <div className="flex gap-2 bg-[#1A222D] p-1 rounded border border-[#2A3544]">
                   {(['auto', 'zh', 'en'] as const).map(v => (
                     <button 
                       key={v}
                       onClick={() => setPageLangPref(v)}
                       className={`flex-1 py-1.5 text-sm rounded transition-colors ${pageLangPref === v ? 'bg-[#3E4F63] text-white shadow font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-[#2C3B4E]'}`}
                     >
                       {v === 'auto' ? '自動 Auto' : v === 'zh' ? '中文' : 'English'}
                     </button>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --------------------- Sub Components ---------------------

interface DeckSectionProps {
  title: string;
  type: 'main' | 'extra' | 'side';
  cards: number[];
  db: Record<number, CardData>;
  className?: string;
  onSelectCard: (id: number) => void;
  selectedCardId: number | null;
  imgLangPref: LangPref;
  pageLangPref: LangPref;
}

function DeckSection({ title, type, cards, db, className = "", onSelectCard, selectedCardId, imgLangPref, pageLangPref }: DeckSectionProps) {
  
  // Calculate Type Counts via YGOPRODeck data
  const counts = useMemo(() => {
    let stats = {
      monster: 0, spell: 0, trap: 0,
      fusion: 0, synchro: 0, xyz: 0, link: 0
    };
    
    cards.forEach(id => {
      const card = db[id];
      if (!card) return;
      const t = card.type.toLowerCase();
      if (t.includes('monster')) stats.monster++;
      if (t.includes('spell')) stats.spell++;
      if (t.includes('trap')) stats.trap++;
      if (t.includes('fusion')) stats.fusion++;
      if (t.includes('synchro')) stats.synchro++;
      if (t.includes('xyz')) stats.xyz++;
      if (t.includes('link')) stats.link++;
    });
    return stats;
  }, [cards, db]);

  const isAutoChinese = navigator.language.startsWith('zh');
  const preferChinesePage = pageLangPref === 'zh' || (pageLangPref === 'auto' && isAutoChinese);

  return (
    <div className={`flex flex-col bg-[#141C25]/80 border border-[#273343] shadow-md ${className}`}>
      
      {/* Section Header */}
      <div className="flex items-end justify-between px-3 py-1.5 bg-gradient-to-r from-[#17212C] to-[#12181F] border-b border-[#2C3B4E]">
        <div className="flex items-center gap-3">
          {/* Master Duel Style White Box Decoration */}
          <div className="flex gap-1 items-center">
             <div className="w-1.5 h-4 bg-gray-200 shadow-sm" />
             {type === 'main' && <div className="w-1 h-3 bg-gray-400 opacity-60" />}
             {type === 'extra' && <div className="w-1 h-3 bg-purple-400 opacity-60" />}
             {type === 'side' && <div className="w-1 h-3 bg-indigo-400 opacity-60" />}
          </div>
          <h2 className="text-base font-bold text-gray-100 tracking-wide drop-shadow-sm">{title}</h2>
          <span className="text-xl font-bold ml-4 text-gray-100">{cards.length}</span>
        </div>

        {/* Dynamic Type Counters depending on Main vs Extra */}
        {type === 'main' && (
          <div className="flex items-center gap-2 md:gap-4 select-none">
            <CounterBadge color="bg-[#CA8D47]" value={counts.monster} />
            <CounterBadge color="bg-[#12B785]" value={counts.spell} />
            <CounterBadge color="bg-[#C84F8D]" value={counts.trap} />
          </div>
        )}

        {type === 'extra' && (
          <div className="flex items-center gap-2 md:gap-4 select-none">
            <CounterBadge color="bg-[#944BBB]" value={counts.fusion} />
            <CounterBadge color="bg-[#E4E4E4]" value={counts.synchro} />
            {/* XYZ is black with a white/grey border */}
            <CounterBadge color="bg-[#1E1E1E] border border-gray-500" value={counts.xyz} />
            <CounterBadge color="bg-[#2161A8]" value={counts.link} />
          </div>
        )}
      </div>

      {/* Grid Canvas */}
      <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-10 gap-x-0.5 gap-y-0.5 p-[2px] bg-black/40 min-h-[140px]">
        {cards.map((id, index) => (
          <CardItem 
             key={`${id}-${index}`} 
             id={id} 
             data={db[id]} 
             onSelectCard={onSelectCard} 
             isSelected={selectedCardId === id} 
             imgLangPref={imgLangPref}
          />
        ))}
        {cards.length === 0 && (
          <div className="col-span-12 flex items-center justify-center p-8 text-gray-500 text-sm">
            {preferChinesePage ? "無卡片" : "No cards"}
          </div>
        )}
      </div>
    </div>
  );
}

const CounterBadge = ({ color, value }: { color: string, value: number }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-2.5 h-3.5 rounded-[2px] shadow-sm ${color}`} />
    <span className="text-sm font-semibold text-gray-200 tracking-wider font-mono">{value}</span>
  </div>
);

// --------------------- Card Component ---------------------

function CardItem({ id, data, onSelectCard, isSelected, imgLangPref }: { id: number, data?: CardData, onSelectCard: (id: number) => void, isSelected?: boolean, imgLangPref: LangPref }) {
  const isAutoChinese = navigator.language.startsWith('zh');
  const preferChinese = imgLangPref === 'zh' || (imgLangPref === 'auto' && isAutoChinese);
  
  const sources = preferChinese ? [
    `https://cdn.233.momobako.com/ygopro/pics/${id}.jpg!half`,
    `https://images.ygoprodeck.com/images/cards/${id}.jpg`,
    `https://cdn.233.momobako.com/ygopro/textures/unknown.jpg`
  ] : [
    `https://images.ygoprodeck.com/images/cards/${id}.jpg`,
    `https://cdn.233.momobako.com/ygopro/pics/${id}.jpg!half`,
    `https://cdn.233.momobako.com/ygopro/textures/unknown.jpg`
  ];

  const [imgSrc, setImgSrc] = useState(sources[0]);
  const [fallbackIndex, setFallbackIndex] = useState(1);

  useEffect(() => {
    setImgSrc(sources[0]);
    setFallbackIndex(1);
  }, [imgLangPref, isAutoChinese]);

  const handleError = () => {
    if (fallbackIndex < sources.length) {
      setImgSrc(sources[fallbackIndex]);
      setFallbackIndex(prev => prev + 1);
    }
  };
  
  // Extract banlist status for OCG
  const limitStatus = data?.banlist_info?.ban_ocg || data?.banlist_info?.ban_tcg;
  let LimitIndicator = null;
  
  if (limitStatus) {
    if (limitStatus === "Limited") {
      LimitIndicator = (
        <div className="absolute -top-1 -left-1 w-5 h-5 flex items-center justify-center bg-[#CD1E1A] border-[1.5px] border-[#FBD63B] rounded-full text-[12px] font-black text-white shadow-md z-10 pointer-events-none drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">
          1
        </div>
      );
    } else if (limitStatus === "Semi-Limited") {
      LimitIndicator = (
        <div className="absolute -top-1 -left-1 w-5 h-5 flex items-center justify-center bg-[#DD691A] border-[1.5px] border-[#FBD63B] rounded-full text-[12px] font-black text-white shadow-md z-10 pointer-events-none drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">
          2
        </div>
      );
    } else if (limitStatus === "Banned") {
      LimitIndicator = (
        <div className="absolute top-0 left-0 w-6 h-6 flex items-center justify-center bg-transparent z-10 pointer-events-none">
          <div className="w-5 h-5 rounded-full border-[3px] border-[#CD1E1A] relative shadow-[0_0_5px_black]">
             <div className="absolute top-1/2 left-0 w-full h-[3px] bg-[#CD1E1A] -rotate-45 -translate-y-1/2" />
          </div>
        </div>
      );
    }
  }

  return (
    <div 
      className={`relative aspect-[29/42] w-full bg-[#1A1A1A] rounded-[1.5px] overflow-visible cursor-pointer transition-transform duration-200 hover:-translate-y-[3px] hover:z-20 hover:shadow-[0_0_15px_rgba(45,212,255,0.7)] group ${isSelected ? 'ring-2 ring-[#FBD63B] shadow-[0_0_15px_rgba(251,214,59,0.8)] z-10 scale-[1.02] -translate-y-[2px]' : ''}`}
      title={data?.name || "未知卡片"}
      onClick={() => onSelectCard(id)}
    >
      <img
        className="w-full h-full object-fill rounded-[1px]"
        src={imgSrc}
        alt={data?.name || id.toString()}
        loading="lazy"
        onError={handleError}
      />
      {LimitIndicator}
      {/* Light Overlay on Hover */}
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-15 transition-opacity pointer-events-none rounded-[1.5px]" />
    </div>
  );
}

function CardDetailsPanel({ id, data, imgLangPref, textLangPref, pageLangPref }: { id: number | null, data?: CardData, imgLangPref: LangPref, textLangPref: LangPref, pageLangPref: LangPref }) {
  const isAutoChinese = navigator.language.startsWith('zh');
  const preferChineseImg = imgLangPref === 'zh' || (imgLangPref === 'auto' && isAutoChinese);
  const preferChineseText = textLangPref === 'zh' || (textLangPref === 'auto' && isAutoChinese);
  const preferChinesePage = pageLangPref === 'zh' || (pageLangPref === 'auto' && isAutoChinese);
  
  const sources = useMemo(() => preferChineseImg ? [
    `https://cdn.233.momobako.com/ygopro/pics/${id}.jpg!half`,
    `https://images.ygoprodeck.com/images/cards/${id}.jpg`,
    `https://cdn.233.momobako.com/ygopro/textures/unknown.jpg`
  ] : [
    `https://images.ygoprodeck.com/images/cards/${id}.jpg`,
    `https://cdn.233.momobako.com/ygopro/pics/${id}.jpg!half`,
    `https://cdn.233.momobako.com/ygopro/textures/unknown.jpg`
  ], [id, preferChineseImg]);

  const [imgSrc, setImgSrc] = useState(sources[0]);
  const [fallbackIndex, setFallbackIndex] = useState(1);

  useEffect(() => {
    if (id) {
      setImgSrc(sources[0]);
      setFallbackIndex(1);
    }
  }, [id, sources]);

  const handleError = () => {
    if (fallbackIndex < sources.length) {
      setImgSrc(sources[fallbackIndex]);
      setFallbackIndex(prev => prev + 1);
    }
  };

  if (!id) {
    return (
      <div className="border border-[#3E4F63] rounded shadow-md bg-[#10141A]/80 h-full flex items-center justify-center text-gray-500 backdrop-blur">
        {preferChinesePage ? '請點選卡片以查看詳情' : 'Please select a card to view details'}
      </div>
    );
  }

  const isMonster = data?.type?.toLowerCase().includes('monster');
  const isSpell = data?.type?.toLowerCase().includes('spell');
  const isTrap = data?.type?.toLowerCase().includes('trap');

  // get card visual color based on type
  let headerBg = "from-[#A55633] to-[#4A2613]"; // Effect Monster brown
  if (data?.type?.includes("Normal")) headerBg = "from-[#D8BB72] to-[#B59141]"; // Normal
  if (data?.type?.includes("Fusion")) headerBg = "from-[#944BBB] to-[#51246D]"; // Fusion
  if (data?.type?.includes("Synchro")) headerBg = "from-[#E4E4E4] to-[#A1A1A1] text-black"; // Synchro
  if (data?.type?.includes("XYZ")) headerBg = "from-[#1E1E1E] to-[#0A0A0A]"; // XYZ
  if (data?.type?.includes("Link")) headerBg = "from-[#2161A8] to-[#0F3562]"; // Link
  if (isSpell) headerBg = "from-[#12B785] to-[#0A7353]"; // Spell
  if (isTrap) headerBg = "from-[#C84F8D] to-[#8C315F]"; // Trap

  // Since data now contains complete ygocdb metadata natively, we don't need zhData fallbacks.
  const displayName = preferChineseText ? (data?.name || `ID: ${id}`) : (data?.en_name || data?.name || `ID: ${id}`);
  const displayDesc = preferChineseText ? (data?.desc || "Loading...") : (data?.en_desc || data?.desc || "Loading..."); 

  const AttrBadge = data?.attribute ? (attrMap[data.attribute.toUpperCase()] || { char: data.attribute.substring(0, 1), bg: "bg-gray-600", ring: "ring-gray-400" }) : null;

  const resolvedAtk = data?.atk;
  const resolvedDef = data?.def;
  const resolvedLevel = data?.level;
  const resolvedLink = data?.linkval;
  
  const displayMonsterType = preferChineseText && data?.type ? 
    data.type.replace(/Monster/g, "").trim().split(/\s+/).map((t: string) => typeDict[t] || t).filter(Boolean).join('/') 
    : data?.type?.replace(/Monster/g, "").trim();

  const displayRace = preferChineseText && data?.race ? (raceDict[data.race] || data.race) : data?.race;

  return (
    <div className="border border-[#3E4F63] rounded shadow-[0_4px_20px_rgba(0,0,0,0.8)] bg-[#10141A] flex flex-col overflow-hidden h-full">
      {/* Title Bar */}
      <div className={`bg-gradient-to-b ${headerBg} font-bold p-2 text-lg border-b border-black flex justify-between items-center px-3 shadow-inner min-h-[44px]`}>
        <span className="truncate drop-shadow-md text-white">{displayName}</span>
        {AttrBadge && (
          <div className={`flex-shrink-0 ml-2 w-7 h-7 rounded-full border-[1.5px] border-white/40 flex items-center justify-center text-sm font-black shadow-[0_0_5px_black] overflow-hidden`}>
            <div className={`w-full h-full flex items-center justify-center ${AttrBadge.bg} ${AttrBadge.char === '光' ? 'text-black' : 'text-white'} drop-shadow-md`}>
              {AttrBadge.char}
            </div>
          </div>
        )}
      </div>

      {/* Image & Stats Container */}
      <div className="flex p-3 gap-3 bg-[#1A222D] border-b border-black">
        <div className="w-[45%] shrink-0 border-[1.5px] border-black shadow-[0_0_8px_black]">
          <img src={imgSrc} onError={handleError} alt={data?.name} className="w-full h-auto object-contain block" />
        </div>
        <div className="flex flex-col gap-2 w-[55%] text-gray-200">
          {isMonster && (
            <>
              {resolvedLevel !== undefined && (
                <div className="flex items-center gap-2 bg-black/60 px-2 py-1.5 rounded shadow-inner border border-[#2A3544]">
                   <span>{data?.type?.includes("XYZ") || data?.type?.includes("超量") ? "⭐" : "🌟"}</span>
                   <span className="font-bold text-xl drop-shadow">{resolvedLevel}</span>
                </div>
              )}
              {resolvedAtk !== undefined && (
                <div className="flex items-center gap-2 bg-black/60 px-2 py-1.5 rounded shadow-inner border border-[#2A3544]">
                   <span className="text-gray-400 text-xs mt-0.5">ATK /</span>
                   <span className="font-mono font-bold text-lg drop-shadow tracking-wider">{resolvedAtk}</span>
                </div>
              )}
              {resolvedDef !== undefined && resolvedDef !== "-" && !(data?.type?.includes("Link") || data?.type?.includes("连接")) && (
                <div className="flex items-center gap-2 bg-black/60 px-2 py-1.5 rounded shadow-inner border border-[#2A3544]">
                   <span className="text-gray-400 text-xs mt-0.5">DEF /</span>
                   <span className="font-mono font-bold text-lg drop-shadow tracking-wider">{resolvedDef}</span>
                </div>
              )}
              {(data?.type?.includes("Link") || data?.type?.includes("连接")) && resolvedLink !== undefined && (
                <div className="flex items-center gap-2 bg-black/60 px-2 py-1.5 rounded shadow-inner border border-[#2A3544]">
                   <span className="text-gray-400 text-xs mt-0.5">LINK-</span>
                   <span className="font-mono font-bold text-lg drop-shadow tracking-wider">{resolvedLink}</span>
                </div>
              )}
            </>
          )}
          {(isSpell || isTrap) && (
            <div className="flex flex-col items-center justify-center h-full bg-black/40 rounded border border-[#2A3544] p-2 text-center text-sm shadow-inner gap-1">
              <span className="opacity-70">{isSpell ? (preferChinesePage ? "魔法卡" : "Spell Card") : (preferChinesePage ? "陷阱卡" : "Trap Card")}</span>
              <span className="font-bold">{displayRace}</span>
            </div>
          )}
          {!isMonster && !isSpell && !isTrap && (
             <div className="flex flex-col items-center justify-center h-full text-gray-500 text-xs">
                {preferChinesePage ? "讀取中..." : "Loading..."}
             </div>
          )}
        </div>
      </div>

      {/* Description Area */}
      <div className="flex-1 bg-[#121820] p-4 overflow-y-auto min-h-[200px] fancy-scrollbar">
        {data?.race && isMonster && (
          <div className="font-bold text-[#E2B772] mb-2 border-b border-[#2C3B4E] pb-1.5 drop-shadow-sm text-[15px]">
             {`【${displayRace || ''} / ${displayMonsterType || ''}】`}
          </div>
        )}
        <div className="text-gray-300 text-[15px] leading-[1.6] tracking-wide font-sans whitespace-pre-wrap drop-shadow-sm">
          {displayDesc}
        </div>
      </div>
    </div>
  );
}
