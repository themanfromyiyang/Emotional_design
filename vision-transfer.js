(function(root){
 'use strict';
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 function statistics(pixels){
  const count=Math.floor(pixels.length/4),stride=Math.max(1,Math.floor(count/65536));
  const sums=[0,0,0],squares=[0,0,0];let chroma=0,samples=0;
  for(let pixel=0;pixel<count;pixel+=stride){const i=pixel*4;if(pixels[i+3]===0)continue;samples++;
   for(let c=0;c<3;c++){const value=pixels[i+c];sums[c]+=value;squares[c]+=value*value;}
   chroma+=(Math.abs(pixels[i]-pixels[i+1])+Math.abs(pixels[i+1]-pixels[i+2]))/2;
  }
  if(!samples)throw new Error('The image has no processable pixels');
  const mean=sums.map(sum=>sum/samples),spread=squares.map((sum,c)=>Math.sqrt(Math.max(0,sum/samples-mean[c]*mean[c])));
  return {mean,spread,chroma:chroma/samples};
 }
 function transferPixels(source,reference){
  const a=statistics(source),b=statistics(reference),output=new Uint8ClampedArray(source.length);
  const gain=a.spread.map((value,c)=>clamp((b.spread[c]+1)/(value+1),.72,1.28));
  const shift=a.mean.map((value,c)=>clamp(b.mean[c]-value,-32,32));
  const saturation=clamp((b.chroma+1)/(a.chroma+1),.45,1.2);
  for(let i=0;i<source.length;i+=4){const transformed=[0,0,0];
   for(let c=0;c<3;c++)transformed[c]=clamp(a.mean[c]+shift[c]+(source[i+c]-a.mean[c])*gain[c],0,255);
   const luminance=.2126*transformed[0]+.7152*transformed[1]+.0722*transformed[2];
   for(let c=0;c<3;c++)output[i+c]=clamp(luminance+(transformed[c]-luminance)*saturation,0,255);
   output[i+3]=source[i+3];
  }
  return output;
 }
 function applyViewMask(pixels,width,height,degrees){
  if(!Number.isFinite(degrees)||degrees>=180||degrees<20)return pixels;
  const visible=degrees/180,edge=(1-visible)/2,feather=Math.min(.035,visible/8);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const distance=Math.min(x/width,1-x/width),opacity=clamp((edge+feather-distance)/feather,0,1)*.92,i=(y*width+x)*4;
   for(let c=0;c<3;c++)pixels[i+c]=Math.round(pixels[i+c]*(1-opacity));
  }
  return pixels;
 }
 async function renderSafeImage(sourceUrl,referenceUrl,viewDegrees){
  const load=async url=>{const image=new Image();image.src=url;await image.decode();return image;};
  const [source,reference]=await Promise.all([load(sourceUrl),load(referenceUrl)]);
  const canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
  const original=ctx.getImageData(0,0,canvas.width,canvas.height);
  const sample=document.createElement('canvas');sample.width=256;sample.height=256;
  const sampleContext=sample.getContext('2d',{willReadFrequently:true});sampleContext.drawImage(reference,0,0,256,256);
  const referencePixels=sampleContext.getImageData(0,0,256,256).data;
  original.data.set(applyViewMask(transferPixels(original.data,referencePixels),canvas.width,canvas.height,viewDegrees));ctx.putImageData(original,0,0);
  return canvas.toDataURL('image/png');
 }
 async function renderViewOnly(sourceUrl,viewDegrees){
  const image=new Image();image.src=sourceUrl;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
  ctx.putImageData(applyViewMask(frame.data,canvas.width,canvas.height,viewDegrees),0,0);
  return canvas.toDataURL('image/png');
 }
 const api={transferPixels,applyViewMask,renderSafeImage,renderViewOnly};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VisionTransfer=api;
})(globalThis);
