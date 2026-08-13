// 生成佛曰内核 kernels/buddha.json（复刻 pi.hahaka.com 的 AES + 替换表算法）
// 运行：node scripts/generate-buddha.js
const fs = require('fs');
const path = require('path');

// 公共算法源码（MD5 + base64 + AES-256 全套 + UTF-8 + EVP_BytesToKey + OpenSSL 高层）
// 会整体内联进 encode 与 decode，保证内核自包含
const COMMON = [
  "function rotl(x,c){return((x<<c)|(x>>>(32-c)))|0;}",
  "function add32(a,b){return(a+b)|0;}",
  "function md5(bytes){var S=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];var K=[];for(var i=0;i<64;i++)K[i]=(Math.abs(Math.sin(i+1))*4294967296)|0;var msg=bytes.slice();var bitLen=bytes.length*8;msg.push(0x80);while(msg.length%64!==56)msg.push(0);for(var j=0;j<4;j++)msg.push((bitLen>>>(j*8))&0xff);for(var j=0;j<4;j++)msg.push(0);var a0=0x67452301,b0=0xefcdab89,c0=0x98badcfe,d0=0x10325476;for(var blk=0;blk<msg.length;blk+=64){var M=[];for(var t=0;t<16;t++){M[t]=msg[blk+t*4]|(msg[blk+t*4+1]<<8)|(msg[blk+t*4+2]<<16)|(msg[blk+t*4+3]<<24);}var A=a0,B=b0,C=c0,D=d0;for(var i=0;i<64;i++){var F,g;if(i<16){F=(B&C)|(~B&D);g=i;}else if(i<32){F=(D&B)|(~D&C);g=(5*i+1)%16;}else if(i<48){F=B^C^D;g=(3*i+5)%16;}else{F=C^(B|~D);g=(7*i)%16;}var tmp=D;D=C;C=B;B=add32(B,rotl(add32(add32(add32(A,F),K[i]),M[g]),S[i]));A=tmp;}a0=add32(a0,A);b0=add32(b0,B);c0=add32(c0,C);d0=add32(d0,D);}var out=[];[a0,b0,c0,d0].forEach(function(v){for(var j=0;j<4;j++)out.push((v>>>(j*8))&0xff);});return out;}",
  "var B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';",
  "function bytesToBase64(bytes){var out='';for(var i=0;i<bytes.length;i+=3){var b0=bytes[i],b1=bytes[i+1],b2=bytes[i+2];var n=(b0<<16)|((b1||0)<<8)|(b2||0);out+=B64[(n>>18)&63]+B64[(n>>12)&63];out+=(i+1<bytes.length)?B64[(n>>6)&63]:'=';out+=(i+2<bytes.length)?B64[n&63]:'=';}return out;}",
  "function base64ToBytes(str){var out=[],buf=0,bits=0;for(var i=0;i<str.length;i++){var c=str[i];if(c==='=')break;var v=B64.indexOf(c);if(v<0)continue;buf=(buf<<6)|v;bits+=6;if(bits>=8){bits-=8;out.push((buf>>bits)&0xff);}}return out;}",
  "var SBOX=[99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22];",
  "var INV_SBOX=[82,9,106,213,48,54,165,56,191,64,163,158,129,243,215,251,124,227,57,130,155,47,255,135,52,142,67,68,196,222,233,203,84,123,148,50,166,194,35,61,238,76,149,11,66,250,195,78,8,46,161,102,40,217,36,178,118,91,162,73,109,139,209,37,114,248,246,100,134,104,152,22,212,164,92,204,93,101,182,146,108,112,72,80,253,237,185,218,94,21,70,87,167,141,157,132,144,216,171,0,140,188,211,10,247,228,88,5,184,179,69,6,208,44,30,143,202,63,15,2,193,175,189,3,1,19,138,107,58,145,17,65,79,103,220,234,151,242,207,206,240,180,230,115,150,172,116,34,231,173,53,133,226,249,55,232,28,117,223,110,71,241,26,113,29,41,197,137,111,183,98,14,170,24,190,27,252,86,62,75,198,210,121,32,154,219,192,254,120,205,90,244,31,221,168,51,136,7,199,49,177,18,16,89,39,128,236,95,96,81,127,169,25,181,74,13,45,229,122,159,147,201,156,239,160,224,59,77,174,42,245,176,200,235,187,60,131,83,153,97,23,43,4,126,186,119,214,38,225,105,20,99,85,33,12,125];",
  "var RCON=[0,1,2,4,8,16,32,64];",
  "function keyExpansion(key){var w=[];for(var i=0;i<8;i++)w[i]=[key[4*i],key[4*i+1],key[4*i+2],key[4*i+3]];for(var i=8;i<60;i++){var t=w[i-1].slice();if(i%8===0){t=[t[1],t[2],t[3],t[0]];for(var j=0;j<4;j++)t[j]=SBOX[t[j]];t[0]^=RCON[i/8];}else if(i%8===4){for(var j=0;j<4;j++)t[j]=SBOX[t[j]];}w[i]=[w[i-8][0]^t[0],w[i-8][1]^t[1],w[i-8][2]^t[2],w[i-8][3]^t[3]];}return w;}",
  "function xtime(x){return((x<<1)^(((x>>7)&1)*27))&255;}",
  "function addRoundKey(s,w,round){for(var c=0;c<4;c++){s[4*c]^=w[round*4+c][0];s[4*c+1]^=w[round*4+c][1];s[4*c+2]^=w[round*4+c][2];s[4*c+3]^=w[round*4+c][3];}}",
  "function subBytes(s){for(var i=0;i<16;i++)s[i]=SBOX[s[i]];}",
  "function invSubBytes(s){for(var i=0;i<16;i++)s[i]=INV_SBOX[s[i]];}",
  "function shiftRows(s){var t;t=s[1];s[1]=s[5];s[5]=s[9];s[9]=s[13];s[13]=t;t=s[2];s[2]=s[10];s[10]=t;t=s[6];s[6]=s[14];s[14]=t;t=s[15];s[15]=s[11];s[11]=s[7];s[7]=s[3];s[3]=t;}",
  "function invShiftRows(s){var t;t=s[13];s[13]=s[9];s[9]=s[5];s[5]=s[1];s[1]=t;t=s[2];s[2]=s[10];s[10]=t;t=s[6];s[6]=s[14];s[14]=t;t=s[3];s[3]=s[7];s[7]=s[11];s[11]=s[15];s[15]=t;}",
  "function mixColumns(s){for(var c=0;c<4;c++){var a0=s[4*c],a1=s[4*c+1],a2=s[4*c+2],a3=s[4*c+3];s[4*c]=xtime(a0)^(a1^xtime(a1))^a2^a3;s[4*c+1]=a0^xtime(a1)^(a2^xtime(a2))^a3;s[4*c+2]=a0^a1^xtime(a2)^(a3^xtime(a3));s[4*c+3]=(a0^xtime(a0))^a1^a2^xtime(a3);}}",
  "function mul9(x){return xtime(xtime(xtime(x)))^x;}function mul11(x){return xtime(xtime(xtime(x)))^xtime(x)^x;}function mul13(x){return xtime(xtime(xtime(x)))^xtime(xtime(x))^x;}function mul14(x){return xtime(xtime(xtime(x)))^xtime(xtime(x))^xtime(x);}",
  "function invMixColumns(s){for(var c=0;c<4;c++){var a0=s[4*c],a1=s[4*c+1],a2=s[4*c+2],a3=s[4*c+3];s[4*c]=mul14(a0)^mul11(a1)^mul13(a2)^mul9(a3);s[4*c+1]=mul9(a0)^mul14(a1)^mul11(a2)^mul13(a3);s[4*c+2]=mul13(a0)^mul9(a1)^mul14(a2)^mul11(a3);s[4*c+3]=mul11(a0)^mul13(a1)^mul9(a2)^mul14(a3);}}",
  "function encryptBlock(s,w){addRoundKey(s,w,0);for(var r=1;r<=13;r++){subBytes(s);shiftRows(s);mixColumns(s);addRoundKey(s,w,r);}subBytes(s);shiftRows(s);addRoundKey(s,w,14);}",
  "function decryptBlock(s,w){addRoundKey(s,w,14);for(var r=13;r>=1;r--){invShiftRows(s);invSubBytes(s);addRoundKey(s,w,r);invMixColumns(s);}invShiftRows(s);invSubBytes(s);addRoundKey(s,w,0);}",
  "function pkcs7(bytes){var pad=16-(bytes.length%16);var out=bytes.slice();for(var i=0;i<pad;i++)out.push(pad);return out;}",
  "function aesCbcEncrypt(plain,key,iv){var w=keyExpansion(key);var padded=pkcs7(plain);var prev=iv.slice(),out=[];for(var b=0;b<padded.length;b+=16){var s=[];for(var i=0;i<16;i++)s[i]=padded[b+i]^prev[i];encryptBlock(s,w);for(var i=0;i<16;i++)out.push(s[i]);prev=s.slice();}return out;}",
  "function aesCbcDecrypt(ct,key,iv){var w=keyExpansion(key);var prev=iv.slice(),out=[];for(var b=0;b<ct.length;b+=16){var s=ct.slice(b,b+16);var cur=s.slice();decryptBlock(s,w);for(var i=0;i<16;i++)s[i]^=prev[i];for(var i=0;i<16;i++)out.push(s[i]);prev=cur;}var pad=out[out.length-1];if(pad>=1&&pad<=16)out=out.slice(0,out.length-pad);return out;}",
  "function utf8Bytes(str){var out=[];for(var i=0;i<str.length;i++){var c=str.charCodeAt(i);if(c<128)out.push(c);else if(c<2048)out.push(192|(c>>6),128|(c&63));else out.push(224|(c>>12),128|((c>>6)&63),128|(c&63));}return out;}",
  "function bytesToUtf8(bytes){var out='';for(var i=0;i<bytes.length;){var c=bytes[i];if(c<128){out+=String.fromCharCode(c);i+=1;}else if(c<224){out+=String.fromCharCode(((c&31)<<6)|(bytes[i+1]&63));i+=2;}else{out+=String.fromCharCode(((c&15)<<12)|((bytes[i+1]&63)<<6)|(bytes[i+2]&63));i+=3;}}return out;}",
  "function evpBytesToKey(password,salt){var pass=utf8Bytes(password);var key=[],iv=[],prev=[];while(key.length+iv.length<48){var data=prev.concat(pass,salt);prev=md5(data);for(var i=0;i<16;i++){if(key.length<32)key.push(prev[i]);else if(iv.length<16)iv.push(prev[i]);}}return{key:key,iv:iv};}",
  "function aesEncryptOpenSSL(msg,password){var salt=[];for(var i=0;i<8;i++)salt.push((Math.random()*256)|0);var d=evpBytesToKey(password,salt);var ct=aesCbcEncrypt(utf8Bytes(msg),d.key,d.iv);var full=[83,97,108,116,101,100,95,95].concat(salt,ct);return bytesToBase64(full);}",
  "function aesDecryptOpenSSL(b64,password){var bytes=base64ToBytes(b64);var salt=bytes.slice(8,16);var ct=bytes.slice(16);var d=evpBytesToKey(password,salt);return bytesToUtf8(aesCbcDecrypt(ct,d.key,d.iv));}"
].join('\n');

// base64 字符 → 佛经汉字（encode 方向）
const ENC_MAP = {
  e:'啰',E:'羯',t:'婆',T:'提',a:'摩',A:'埵',o:'诃',O:'迦',i:'耶',I:'吉',n:'娑',N:'佛',
  s:'夜',S:'驮',h:'那',H:'谨',r:'悉',R:'墀',d:'阿',D:'呼',l:'萨',L:'尼',c:'陀',C:'唵',
  u:'唎',U:'伊',m:'卢',M:'喝',w:'帝',W:'烁',f:'醯',F:'蒙',g:'罚',G:'沙',y:'嚧',Y:'他',
  p:'南',P:'豆',b:'无',B:'孕',v:'菩',V:'伽',k:'怛',K:'俱',j:'哆',J:'度',x:'皤',X:'阇',
  q:'室',Q:'地',z:'利',Z:'遮','0':'穆','1':'参','2':'舍','3':'苏','4':'钵','5':'曳',
  '6':'数','7':'写','8':'栗','9':'楞','+':'咩','/':'输','=':'漫'
};

const encodeSrc = 'function(input, params) {\n' + COMMON + '\n' +
  "var p = params || {};\n" +
  "var key = p.key || 'hahaka.com';\n" +
  "var MAP = " + JSON.stringify(ENC_MAP) + ";\n" +
  "var enc = aesEncryptOpenSSL(input, key);\n" +
  "enc = enc.substring(10);\n" +
  "var out = '';\n" +
  "for (var i = 0; i < enc.length; i++) { out += MAP[enc[i]] || enc[i]; }\n" +
  "return '佛曰：' + out;\n" +
  '}';

const decodeSrc = 'function(input, params) {\n' + COMMON + '\n' +
  "var p = params || {};\n" +
  "var key = p.key || 'hahaka.com';\n" +
  "var REV = {};\n" +
  "var MAP = " + JSON.stringify(ENC_MAP) + ";\n" +
  "for (var k in MAP) REV[MAP[k]] = k;\n" +
  "var str = input.substring(3);\n" +
  "var b64 = '';\n" +
  "for (var i = 0; i < str.length; i++) { b64 += REV[str[i]] || str[i]; }\n" +
  "return aesDecryptOpenSSL('U2FsdGVkX1' + b64, key);\n" +
  '}';

const kernel = {
  name: { zh: '佛曰编码', en: 'Buddha' },
  version: '1.0.0',
  description: {
    zh: '复刻 pi.hahaka.com 的「与佛论禅」：AES 加密后映射为佛经风格汉字，输出以「佛曰：」开头，可设密钥（暗号）。',
    en: 'A port of pi.hahaka.com "Buddha" cipher: AES-encrypts then maps to sutra-style characters, prefixed with "佛曰：", with an optional key.'
  },
  author: '内置示例',
  params: [
    { name: 'key', type: 'string', label: { zh: '密钥', en: 'Key' }, default: 'hahaka.com', placeholder: { zh: '暗号（默认 hahaka.com）', en: 'Passphrase (default hahaka.com)' }, description: { zh: '加密/解密的密钥，需与原站一致才能互通。', en: 'The passphrase; must match the original site to interoperate.' } }
  ],
  encode: encodeSrc,
  decode: decodeSrc
};

const outDir = path.join(__dirname, '..', 'kernels');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'buddha.json'), JSON.stringify(kernel, null, 2) + '\n', 'utf-8');
console.log('已生成 kernels/buddha.json');
