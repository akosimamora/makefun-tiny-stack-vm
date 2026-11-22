import{readFileSync as r,mkdirSync as m,writeFileSync as w,readdirSync as d}from"node:fs";
const F={16:(a,b)=>(a+b)|0,17:(a,b)=>(a-b)|0,18:Math.imul,19:(a,b)=>(a/b)|0,20:(a,b)=>a%b,21:(a,b)=>(a>>>0)/(b>>>0)|0,22:(a,b)=>(a>>>0)%(b>>>0)|0,24:(a,b)=>a&b,25:(a,b)=>a|b,26:(a,b)=>a^b,28:(a,b)=>a<<b,29:(a,b)=>a>>b,30:(a,b)=>a>>>b|0,32:(a,b)=>a==b?1:0,33:(a,b)=>a<b?1:0,34:(a,b)=>(a>>>0)<(b>>>0)?1:0};
const I=process.env.MAKEFUN_INPUT_DIR??"/input",O=process.env.MAKEFUN_OUTPUT_DIR??"/output";
for(const f of d(I).sort()){
let p=r(I+"/"+f+"/program.bin"),n=r(I+"/"+f+"/input.bin"),s=[],c=[],g=[],o=[],x=0,q=0,t=0,e=0,a,b,k,L;
const z=(u,v)=>{if(s.length<u)throw 2;if(s.length-u+v>256)throw 3};
try{for(;;){
if(t++>=1e6)throw 10;
if(x<0||x>=p.length)throw 9;
k=p[x];L=k==1?1:k==2?4:k>47&&k<52?2:0;
if(x+1+L>p.length)throw 9;
if(F[k]){z(2,1);b=s.pop();a=s.pop();if(!b&&k>18&&k<23)throw 4;s.push(F[k](a,b));x++;continue}
if(k==23||k==27){z(1,1);a=s.pop();s.push(k==23?-a|0:~a);x++;continue}
switch(k){
case 0:throw 0;
case 1:z(0,1);s.push((p[x+1]<<24)>>24);x+=2;break;
case 2:z(0,1);s.push(p.readInt32LE(x+1));x+=5;break;
case 3:z(1,0);s.pop();x++;break;
case 4:z(1,2);s.push(s[s.length-1]);x++;break;
case 5:z(2,2);s.push(s.splice(-2,1)[0]);x++;break;
case 6:z(2,3);s.push(s[s.length-2]);x++;break;
case 7:z(3,3);s.push(s.shift());x++;break;
case 48:x+=p.readInt16LE(x+1)+3;break;
case 49:z(1,0);x+=s.pop()?3:p.readInt16LE(x+1)+3;break;
case 50:z(1,0);x+=s.pop()?p.readInt16LE(x+1)+3:3;break;
case 51:if(c.length>63)throw 7;c.push(x+3);x=p[x+1]|p[x+2]<<8;break;
case 52:if(!c.length)throw 8;x=c.pop();break;
case 64:z(1,1);a=s.pop();if(a<0||a>255)throw 6;s.push(g[a]||0);x++;break;
case 65:z(2,0);a=s.pop();b=s.pop();if(a<0||a>255)throw 6;g[a]=b;x++;break;
case 80:z(1,0);a=s.pop();b=String(a);if(o.length+b.length>65536)throw 11;o.push(...Buffer.from(b));x++;break;
case 81:z(1,0);if(o.length>65535)throw 11;o.push(s.pop()&255);x++;break;
case 82:z(0,1);s.push(q<n.length?n[q++]:-1);x++;break;
case 83:z(1,0);throw s.pop()&255;
default:throw 5;
}
}}catch(v){e=v}
m(O+"/"+f,{recursive:!0});
w(O+"/"+f+"/stdout.bin",Buffer.from(o));
w(O+"/"+f+"/exit.txt",e+"\n");
}
