const parseYgocdb = (result: any) => {
  const text = result.text || {};
  const typesText = text.types || "";
  
  let type = [];
  let race = undefined;
  let attribute = undefined;
  let atk = undefined;
  let def = undefined;
  let level = undefined;
  let linkval = undefined;
  
  const lines = typesText.split('\n');
  if (lines.length > 0) {
    const firstLine = lines[0];
    const matchType = firstLine.match(/\[(.*?)\]/);
    if (matchType) {
      const typeParts = matchType[1].split('|');
      type = typeParts; // ["怪兽", "效果"] or ["魔法", "速攻"]
    }
    const matchRaceAttr = firstLine.match(/\]\s*(.*)\/(.*)/);
    if (matchRaceAttr) {
      race = matchRaceAttr[1];
      attribute = matchRaceAttr[2];
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
  
  // translate type back to English-like flags for compatibility
  let engType = "";
  if (type.includes("怪兽")) engType += "Monster ";
  if (type.includes("效果")) engType += "Effect ";
  if (type.includes("通常")) engType += "Normal ";
  if (type.includes("融合")) engType += "Fusion ";
  if (type.includes("同调")) engType += "Synchro ";
  if (type.includes("超量")) engType += "XYZ ";
  if (type.includes("连接")) engType += "Link ";
  if (type.includes("魔法")) engType += "Spell ";
  if (type.includes("陷阱")) engType += "Trap ";
  
  let engAttr = attribute;
  if (attribute === "地") engAttr = "EARTH";
  if (attribute === "水") engAttr = "WATER";
  if (attribute === "炎") engAttr = "FIRE";
  if (attribute === "风") engAttr = "WIND";
  if (attribute === "光") engAttr = "LIGHT";
  if (attribute === "暗") engAttr = "DARK";
  if (attribute === "神") engAttr = "DIVINE";
  
  return {
    engType: engType.trim(),
    engAttr,
    race,
    atk, def, level, linkval
  };
};

fetch('https://ygocdb.com/api/v0/?search=23434538')
  .then(r=>r.json())
  .then(j => console.log(parseYgocdb(j.result[0])));
