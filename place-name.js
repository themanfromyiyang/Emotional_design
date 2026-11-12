/* Natural Earth 10m populated places, bundled in assets/place-names.json. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.PlaceNames=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const radians=Math.PI/180;
 function distance(lat,lng,otherLat,otherLng){
  const a=lat*radians,b=otherLat*radians,dLat=(otherLat-lat)*radians,dLng=(otherLng-lng)*radians;
  const h=Math.sin(dLat/2)**2+Math.cos(a)*Math.cos(b)*Math.sin(dLng/2)**2;
  return 12742*Math.asin(Math.min(1,Math.sqrt(h)));
 }
 function nearest(point,cities){
  let best=null,bestDistance=Infinity;
  for(const city of cities){
   const km=distance(point.lat,point.lng,city[0],city[1]);
   if(km<bestDistance){best=city;bestDistance=km;}
  }
  return best?{name:best[2],countryCode:best[3],km:bestDistance}:null;
 }
 function label(point,cities,locale='zh-CN',landmarks=[]){
  const landmark=landmarks.find(site=>distance(point.lat,point.lng,site.lat,site.lng)<10);
  if(landmark)return landmark.name;
  const place=nearest(point,cities);
  if(!place)return null;
  let country='';
  try{country=new Intl.DisplayNames([locale],{type:'region'}).of(place.countryCode)||'';}catch{}
  const name=country&&country!==place.name?country+' · '+place.name:place.name;
  if(place.km<15)return name;
  if(place.km<150)return name+'附近';
  return `距${name}约${Math.round(place.km/10)*10}公里`;
 }
 return {distance,nearest,label};
});
