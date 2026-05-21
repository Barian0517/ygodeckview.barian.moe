const u = [
  'https://cdn.233.momobako.com/ygopro/textures/att_water.png',
  'https://cdn.233.momobako.com/ygopro/textures/water.png',
  'https://ygocdb.com/images/att_water.png',
  'https://ygocdb.com/public/images/water.png'
];

Promise.all(u.map(x => fetch(x).then(r => console.log(x, r.status))));

