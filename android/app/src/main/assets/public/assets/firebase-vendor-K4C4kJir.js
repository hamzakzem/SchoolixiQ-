const MT=()=>{};var Od={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xp=function(n){const e=[];let t=0;for(let r=0;r<n.length;r++){let i=n.charCodeAt(r);i<128?e[t++]=i:i<2048?(e[t++]=i>>6|192,e[t++]=i&63|128):(i&64512)===55296&&r+1<n.length&&(n.charCodeAt(r+1)&64512)===56320?(i=65536+((i&1023)<<10)+(n.charCodeAt(++r)&1023),e[t++]=i>>18|240,e[t++]=i>>12&63|128,e[t++]=i>>6&63|128,e[t++]=i&63|128):(e[t++]=i>>12|224,e[t++]=i>>6&63|128,e[t++]=i&63|128)}return e},FT=function(n){const e=[];let t=0,r=0;for(;t<n.length;){const i=n[t++];if(i<128)e[r++]=String.fromCharCode(i);else if(i>191&&i<224){const s=n[t++];e[r++]=String.fromCharCode((i&31)<<6|s&63)}else if(i>239&&i<365){const s=n[t++],o=n[t++],c=n[t++],u=((i&7)<<18|(s&63)<<12|(o&63)<<6|c&63)-65536;e[r++]=String.fromCharCode(55296+(u>>10)),e[r++]=String.fromCharCode(56320+(u&1023))}else{const s=n[t++],o=n[t++];e[r++]=String.fromCharCode((i&15)<<12|(s&63)<<6|o&63)}}return e.join("")},Zp={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,e){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let i=0;i<n.length;i+=3){const s=n[i],o=i+1<n.length,c=o?n[i+1]:0,u=i+2<n.length,l=u?n[i+2]:0,d=s>>2,p=(s&3)<<4|c>>4;let m=(c&15)<<2|l>>6,T=l&63;u||(T=64,o||(m=64)),r.push(t[d],t[p],t[m],t[T])}return r.join("")},encodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(n):this.encodeByteArray(Xp(n),e)},decodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(n):FT(this.decodeStringToByteArray(n,e))},decodeStringToByteArray(n,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let i=0;i<n.length;){const s=t[n.charAt(i++)],c=i<n.length?t[n.charAt(i)]:0;++i;const l=i<n.length?t[n.charAt(i)]:64;++i;const p=i<n.length?t[n.charAt(i)]:64;if(++i,s==null||c==null||l==null||p==null)throw new UT;const m=s<<2|c>>4;if(r.push(m),l!==64){const T=c<<4&240|l>>2;if(r.push(T),p!==64){const P=l<<6&192|p;r.push(P)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}};class UT extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const BT=function(n){const e=Xp(n);return Zp.encodeByteArray(e,!0)},Jo=function(n){return BT(n).replace(/\./g,"")},em=function(n){try{return Zp.decodeString(n,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function tm(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qT=()=>tm().__FIREBASE_DEFAULTS__,jT=()=>{if(typeof process>"u"||typeof Od>"u")return;const n=Od.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},$T=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=n&&em(n[1]);return e&&JSON.parse(e)},Aa=()=>{try{return MT()||qT()||jT()||$T()}catch(n){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${n}`);return}},nm=n=>{var e,t;return(t=(e=Aa())===null||e===void 0?void 0:e.emulatorHosts)===null||t===void 0?void 0:t[n]},rm=n=>{const e=nm(n);if(!e)return;const t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const r=parseInt(e.substring(t+1),10);return e[0]==="["?[e.substring(1,t-1),r]:[e.substring(0,t),r]},im=()=>{var n;return(n=Aa())===null||n===void 0?void 0:n.config},sm=n=>{var e;return(e=Aa())===null||e===void 0?void 0:e[`_${n}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zT{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,r)=>{t?this.reject(t):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,r))}}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Yt(n){try{return(n.startsWith("http://")||n.startsWith("https://")?new URL(n).hostname:n).endsWith(".cloudworkstations.dev")}catch{return!1}}async function ba(n){return(await fetch(n,{credentials:"include"})).ok}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function om(n,e){if(n.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},r=e||"demo-project",i=n.iat||0,s=n.sub||n.user_id;if(!s)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o=Object.assign({iss:`https://securetoken.google.com/${r}`,aud:r,iat:i,exp:i+3600,auth_time:i,sub:s,user_id:s,firebase:{sign_in_provider:"custom",identities:{}}},n);return[Jo(JSON.stringify(t)),Jo(JSON.stringify(o)),""].join(".")}const as={};function GT(){const n={prod:[],emulator:[]};for(const e of Object.keys(as))as[e]?n.emulator.push(e):n.prod.push(e);return n}function KT(n){let e=document.getElementById(n),t=!1;return e||(e=document.createElement("div"),e.setAttribute("id",n),t=!0),{created:t,element:e}}let xd=!1;function Wu(n,e){if(typeof window>"u"||typeof document>"u"||!Yt(window.location.host)||as[n]===e||as[n]||xd)return;as[n]=e;function t(m){return`__firebase__banner__${m}`}const r="__firebase__banner",s=GT().prod.length>0;function o(){const m=document.getElementById(r);m&&m.remove()}function c(m){m.style.display="flex",m.style.background="#7faaf0",m.style.position="fixed",m.style.bottom="5px",m.style.left="5px",m.style.padding=".5em",m.style.borderRadius="5px",m.style.alignItems="center"}function u(m,T){m.setAttribute("width","24"),m.setAttribute("id",T),m.setAttribute("height","24"),m.setAttribute("viewBox","0 0 24 24"),m.setAttribute("fill","none"),m.style.marginLeft="-6px"}function l(){const m=document.createElement("span");return m.style.cursor="pointer",m.style.marginLeft="16px",m.style.fontSize="24px",m.innerHTML=" &times;",m.onclick=()=>{xd=!0,o()},m}function d(m,T){m.setAttribute("id",T),m.innerText="Learn more",m.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",m.setAttribute("target","__blank"),m.style.paddingLeft="5px",m.style.textDecoration="underline"}function p(){const m=KT(r),T=t("text"),P=document.getElementById(T)||document.createElement("span"),D=t("learnmore"),k=document.getElementById(D)||document.createElement("a"),U=t("preprendIcon"),B=document.getElementById(U)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(m.created){const M=m.element;c(M),d(k,D);const G=l();u(B,U),M.append(B,P,k,G),document.body.appendChild(M)}s?(P.innerText="Preview backend disconnected.",B.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(B.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,P.innerText="Preview backend running in this workspace."),P.setAttribute("id",T)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",p):p()}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pe(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function WT(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(Pe())}function am(){var n;const e=(n=Aa())===null||n===void 0?void 0:n.forceEnvironment;if(e==="node")return!0;if(e==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function HT(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function Hu(){const n=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof n=="object"&&n.id!==void 0}function QT(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function YT(){const n=Pe();return n.indexOf("MSIE ")>=0||n.indexOf("Trident/")>=0}function cm(){return!am()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function um(){return!am()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function Ra(){try{return typeof indexedDB=="object"}catch{return!1}}function Qu(){return new Promise((n,e)=>{try{let t=!0;const r="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(r);i.onsuccess=()=>{i.result.close(),t||self.indexedDB.deleteDatabase(r),n(!0)},i.onupgradeneeded=()=>{t=!1},i.onerror=()=>{var s;e(((s=i.error)===null||s===void 0?void 0:s.message)||"")}}catch(t){e(t)}})}function lm(){return!(typeof navigator>"u"||!navigator.cookieEnabled)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const JT="FirebaseError";class mt extends Error{constructor(e,t,r){super(t),this.code=e,this.customData=r,this.name=JT,Object.setPrototypeOf(this,mt.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,yr.prototype.create)}}class yr{constructor(e,t,r){this.service=e,this.serviceName=t,this.errors=r}create(e,...t){const r=t[0]||{},i=`${this.service}/${e}`,s=this.errors[e],o=s?XT(s,r):"Error",c=`${this.serviceName}: ${o} (${i}).`;return new mt(i,c,r)}}function XT(n,e){return n.replace(ZT,(t,r)=>{const i=e[r];return i!=null?String(i):`<${r}?>`})}const ZT=/\{\$([^}]+)}/g;function eE(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}function dt(n,e){if(n===e)return!0;const t=Object.keys(n),r=Object.keys(e);for(const i of t){if(!r.includes(i))return!1;const s=n[i],o=e[i];if(Ld(s)&&Ld(o)){if(!dt(s,o))return!1}else if(s!==o)return!1}for(const i of r)if(!t.includes(i))return!1;return!0}function Ld(n){return n!==null&&typeof n=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fi(n){const e=[];for(const[t,r]of Object.entries(n))Array.isArray(r)?r.forEach(i=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(i))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function es(n){const e={};return n.replace(/^\?/,"").split("&").forEach(r=>{if(r){const[i,s]=r.split("=");e[decodeURIComponent(i)]=decodeURIComponent(s)}}),e}function ts(n){const e=n.indexOf("?");if(!e)return"";const t=n.indexOf("#",e);return n.substring(e,t>0?t:void 0)}function tE(n,e){const t=new nE(n,e);return t.subscribe.bind(t)}class nE{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,r){let i;if(e===void 0&&t===void 0&&r===void 0)throw new Error("Missing Observer.");rE(e,["next","error","complete"])?i=e:i={next:e,error:t,complete:r},i.next===void 0&&(i.next=Fc),i.error===void 0&&(i.error=Fc),i.complete===void 0&&(i.complete=Fc);const s=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?i.error(this.finalError):i.complete()}catch{}}),this.observers.push(i),s}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function rE(n,e){if(typeof n!="object"||n===null)return!1;for(const t of e)if(t in n&&typeof n[t]=="function")return!0;return!1}function Fc(){}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const iE=1e3,sE=2,oE=14400*1e3,aE=.5;function Md(n,e=iE,t=sE){const r=e*Math.pow(t,n),i=Math.round(aE*r*(Math.random()-.5)*2);return Math.min(oE,r+i)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function j(n){return n&&n._delegate?n._delegate:n}class ft{constructor(e,t,r){this.name=e,this.instanceFactory=t,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gn="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cE{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const r=new zT;if(this.instancesDeferred.set(t,r),this.isInitialized(t)||this.shouldAutoInitialize())try{const i=this.getOrInitializeService({instanceIdentifier:t});i&&r.resolve(i)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){var t;const r=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),i=(t=e==null?void 0:e.optional)!==null&&t!==void 0?t:!1;if(this.isInitialized(r)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:r})}catch(s){if(i)return null;throw s}else{if(i)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(lE(e))try{this.getOrInitializeService({instanceIdentifier:Gn})}catch{}for(const[t,r]of this.instancesDeferred.entries()){const i=this.normalizeInstanceIdentifier(t);try{const s=this.getOrInitializeService({instanceIdentifier:i});r.resolve(s)}catch{}}}}clearInstance(e=Gn){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=Gn){return this.instances.has(e)}getOptions(e=Gn){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const i=this.getOrInitializeService({instanceIdentifier:r,options:t});for(const[s,o]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(s);r===c&&o.resolve(i)}return i}onInit(e,t){var r;const i=this.normalizeInstanceIdentifier(t),s=(r=this.onInitCallbacks.get(i))!==null&&r!==void 0?r:new Set;s.add(e),this.onInitCallbacks.set(i,s);const o=this.instances.get(i);return o&&e(o,i),()=>{s.delete(e)}}invokeOnInitCallbacks(e,t){const r=this.onInitCallbacks.get(t);if(r)for(const i of r)try{i(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:uE(e),options:t}),this.instances.set(e,r),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=Gn){return this.component?this.component.multipleInstances?e:Gn:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function uE(n){return n===Gn?void 0:n}function lE(n){return n.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hE{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new cE(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var X;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(X||(X={}));const dE={debug:X.DEBUG,verbose:X.VERBOSE,info:X.INFO,warn:X.WARN,error:X.ERROR,silent:X.SILENT},fE=X.INFO,pE={[X.DEBUG]:"log",[X.VERBOSE]:"log",[X.INFO]:"info",[X.WARN]:"warn",[X.ERROR]:"error"},mE=(n,e,...t)=>{if(e<n.logLevel)return;const r=new Date().toISOString(),i=pE[e];if(i)console[i](`[${r}]  ${n.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class Sa{constructor(e){this.name=e,this._logLevel=fE,this._logHandler=mE,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in X))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?dE[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,X.DEBUG,...e),this._logHandler(this,X.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,X.VERBOSE,...e),this._logHandler(this,X.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,X.INFO,...e),this._logHandler(this,X.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,X.WARN,...e),this._logHandler(this,X.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,X.ERROR,...e),this._logHandler(this,X.ERROR,...e)}}const gE=(n,e)=>e.some(t=>n instanceof t);let Fd,Ud;function _E(){return Fd||(Fd=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function yE(){return Ud||(Ud=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const hm=new WeakMap,uu=new WeakMap,dm=new WeakMap,Uc=new WeakMap,Yu=new WeakMap;function IE(n){const e=new Promise((t,r)=>{const i=()=>{n.removeEventListener("success",s),n.removeEventListener("error",o)},s=()=>{t(_n(n.result)),i()},o=()=>{r(n.error),i()};n.addEventListener("success",s),n.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&hm.set(t,n)}).catch(()=>{}),Yu.set(e,n),e}function TE(n){if(uu.has(n))return;const e=new Promise((t,r)=>{const i=()=>{n.removeEventListener("complete",s),n.removeEventListener("error",o),n.removeEventListener("abort",o)},s=()=>{t(),i()},o=()=>{r(n.error||new DOMException("AbortError","AbortError")),i()};n.addEventListener("complete",s),n.addEventListener("error",o),n.addEventListener("abort",o)});uu.set(n,e)}let lu={get(n,e,t){if(n instanceof IDBTransaction){if(e==="done")return uu.get(n);if(e==="objectStoreNames")return n.objectStoreNames||dm.get(n);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return _n(n[e])},set(n,e,t){return n[e]=t,!0},has(n,e){return n instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in n}};function EE(n){lu=n(lu)}function vE(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const r=n.call(Bc(this),e,...t);return dm.set(r,e.sort?e.sort():[e]),_n(r)}:yE().includes(n)?function(...e){return n.apply(Bc(this),e),_n(hm.get(this))}:function(...e){return _n(n.apply(Bc(this),e))}}function wE(n){return typeof n=="function"?vE(n):(n instanceof IDBTransaction&&TE(n),gE(n,_E())?new Proxy(n,lu):n)}function _n(n){if(n instanceof IDBRequest)return IE(n);if(Uc.has(n))return Uc.get(n);const e=wE(n);return e!==n&&(Uc.set(n,e),Yu.set(e,n)),e}const Bc=n=>Yu.get(n);function fm(n,e,{blocked:t,upgrade:r,blocking:i,terminated:s}={}){const o=indexedDB.open(n,e),c=_n(o);return r&&o.addEventListener("upgradeneeded",u=>{r(_n(o.result),u.oldVersion,u.newVersion,_n(o.transaction),u)}),t&&o.addEventListener("blocked",u=>t(u.oldVersion,u.newVersion,u)),c.then(u=>{s&&u.addEventListener("close",()=>s()),i&&u.addEventListener("versionchange",l=>i(l.oldVersion,l.newVersion,l))}).catch(()=>{}),c}const AE=["get","getKey","getAll","getAllKeys","count"],bE=["put","add","delete","clear"],qc=new Map;function Bd(n,e){if(!(n instanceof IDBDatabase&&!(e in n)&&typeof e=="string"))return;if(qc.get(e))return qc.get(e);const t=e.replace(/FromIndex$/,""),r=e!==t,i=bE.includes(t);if(!(t in(r?IDBIndex:IDBObjectStore).prototype)||!(i||AE.includes(t)))return;const s=async function(o,...c){const u=this.transaction(o,i?"readwrite":"readonly");let l=u.store;return r&&(l=l.index(c.shift())),(await Promise.all([l[t](...c),i&&u.done]))[0]};return qc.set(e,s),s}EE(n=>({...n,get:(e,t,r)=>Bd(e,t)||n.get(e,t,r),has:(e,t)=>!!Bd(e,t)||n.has(e,t)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class RE{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(SE(t)){const r=t.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(t=>t).join(" ")}}function SE(n){const e=n.getComponent();return(e==null?void 0:e.type)==="VERSION"}const hu="@firebase/app",qd="0.13.2";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gt=new Sa("@firebase/app"),PE="@firebase/app-compat",CE="@firebase/analytics-compat",kE="@firebase/analytics",DE="@firebase/app-check-compat",NE="@firebase/app-check",VE="@firebase/auth",OE="@firebase/auth-compat",xE="@firebase/database",LE="@firebase/data-connect",ME="@firebase/database-compat",FE="@firebase/functions",UE="@firebase/functions-compat",BE="@firebase/installations",qE="@firebase/installations-compat",jE="@firebase/messaging",$E="@firebase/messaging-compat",zE="@firebase/performance",GE="@firebase/performance-compat",KE="@firebase/remote-config",WE="@firebase/remote-config-compat",HE="@firebase/storage",QE="@firebase/storage-compat",YE="@firebase/firestore",JE="@firebase/ai",XE="@firebase/firestore-compat",ZE="firebase",ev="11.10.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xo="[DEFAULT]",tv={[hu]:"fire-core",[PE]:"fire-core-compat",[kE]:"fire-analytics",[CE]:"fire-analytics-compat",[NE]:"fire-app-check",[DE]:"fire-app-check-compat",[VE]:"fire-auth",[OE]:"fire-auth-compat",[xE]:"fire-rtdb",[LE]:"fire-data-connect",[ME]:"fire-rtdb-compat",[FE]:"fire-fn",[UE]:"fire-fn-compat",[BE]:"fire-iid",[qE]:"fire-iid-compat",[jE]:"fire-fcm",[$E]:"fire-fcm-compat",[zE]:"fire-perf",[GE]:"fire-perf-compat",[KE]:"fire-rc",[WE]:"fire-rc-compat",[HE]:"fire-gcs",[QE]:"fire-gcs-compat",[YE]:"fire-fst",[XE]:"fire-fst-compat",[JE]:"fire-vertex","fire-js":"fire-js",[ZE]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Zo=new Map,nv=new Map,du=new Map;function jd(n,e){try{n.container.addComponent(e)}catch(t){Gt.debug(`Component ${e.name} failed to register with FirebaseApp ${n.name}`,t)}}function Et(n){const e=n.name;if(du.has(e))return Gt.debug(`There were multiple attempts to register component ${e}.`),!1;du.set(e,n);for(const t of Zo.values())jd(t,n);for(const t of nv.values())jd(t,n);return!0}function Nt(n,e){const t=n.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),n.container.getProvider(e)}function rv(n,e,t=Xo){Nt(n,e).clearInstance(t)}function me(n){return n==null?!1:n.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const iv={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},yn=new yr("app","Firebase",iv);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sv{constructor(e,t,r){this._isDeleted=!1,this._options=Object.assign({},e),this._config=Object.assign({},t),this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new ft("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw yn.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ir=ev;function ov(n,e={}){let t=n;typeof e!="object"&&(e={name:e});const r=Object.assign({name:Xo,automaticDataCollectionEnabled:!0},e),i=r.name;if(typeof i!="string"||!i)throw yn.create("bad-app-name",{appName:String(i)});if(t||(t=im()),!t)throw yn.create("no-options");const s=Zo.get(i);if(s){if(dt(t,s.options)&&dt(r,s.config))return s;throw yn.create("duplicate-app",{appName:i})}const o=new hE(i);for(const u of du.values())o.addComponent(u);const c=new sv(t,r,o);return Zo.set(i,c),c}function Pa(n=Xo){const e=Zo.get(n);if(!e&&n===Xo&&im())return ov();if(!e)throw yn.create("no-app",{appName:n});return e}function tt(n,e,t){var r;let i=(r=tv[n])!==null&&r!==void 0?r:n;t&&(i+=`-${t}`);const s=i.match(/\s|\//),o=e.match(/\s|\//);if(s||o){const c=[`Unable to register library "${i}" with version "${e}":`];s&&c.push(`library name "${i}" contains illegal characters (whitespace or "/")`),s&&o&&c.push("and"),o&&c.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Gt.warn(c.join(" "));return}Et(new ft(`${i}-version`,()=>({library:i,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const av="firebase-heartbeat-database",cv=1,ws="firebase-heartbeat-store";let jc=null;function pm(){return jc||(jc=fm(av,cv,{upgrade:(n,e)=>{switch(e){case 0:try{n.createObjectStore(ws)}catch(t){console.warn(t)}}}}).catch(n=>{throw yn.create("idb-open",{originalErrorMessage:n.message})})),jc}async function uv(n){try{const t=(await pm()).transaction(ws),r=await t.objectStore(ws).get(mm(n));return await t.done,r}catch(e){if(e instanceof mt)Gt.warn(e.message);else{const t=yn.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});Gt.warn(t.message)}}}async function $d(n,e){try{const r=(await pm()).transaction(ws,"readwrite");await r.objectStore(ws).put(e,mm(n)),await r.done}catch(t){if(t instanceof mt)Gt.warn(t.message);else{const r=yn.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});Gt.warn(r.message)}}}function mm(n){return`${n.name}!${n.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lv=1024,hv=30;class dv{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new pv(t),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,t;try{const i=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=zd();if(((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)===null||t===void 0?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(o=>o.date===s))return;if(this._heartbeatsCache.heartbeats.push({date:s,agent:i}),this._heartbeatsCache.heartbeats.length>hv){const o=mv(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(r){Gt.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=zd(),{heartbeatsToSend:r,unsentEntries:i}=fv(this._heartbeatsCache.heartbeats),s=Jo(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=t,i.length>0?(this._heartbeatsCache.heartbeats=i,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(t){return Gt.warn(t),""}}}function zd(){return new Date().toISOString().substring(0,10)}function fv(n,e=lv){const t=[];let r=n.slice();for(const i of n){const s=t.find(o=>o.agent===i.agent);if(s){if(s.dates.push(i.date),Gd(t)>e){s.dates.pop();break}}else if(t.push({agent:i.agent,dates:[i.date]}),Gd(t)>e){t.pop();break}r=r.slice(1)}return{heartbeatsToSend:t,unsentEntries:r}}class pv{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Ra()?Qu().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await uv(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var t;if(await this._canUseIndexedDBPromise){const i=await this.read();return $d(this.app,{lastSentHeartbeatDate:(t=e.lastSentHeartbeatDate)!==null&&t!==void 0?t:i.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var t;if(await this._canUseIndexedDBPromise){const i=await this.read();return $d(this.app,{lastSentHeartbeatDate:(t=e.lastSentHeartbeatDate)!==null&&t!==void 0?t:i.lastSentHeartbeatDate,heartbeats:[...i.heartbeats,...e.heartbeats]})}else return}}function Gd(n){return Jo(JSON.stringify({version:2,heartbeats:n})).length}function mv(n){if(n.length===0)return-1;let e=0,t=n[0].date;for(let r=1;r<n.length;r++)n[r].date<t&&(t=n[r].date,e=r);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gv(n){Et(new ft("platform-logger",e=>new RE(e),"PRIVATE")),Et(new ft("heartbeat",e=>new dv(e),"PRIVATE")),tt(hu,qd,n),tt(hu,qd,"esm2017"),tt("fire-js","")}gv("");var _v="firebase",yv="11.10.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */tt(_v,yv,"app");function Ju(n,e){var t={};for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&e.indexOf(r)<0&&(t[r]=n[r]);if(n!=null&&typeof Object.getOwnPropertySymbols=="function")for(var i=0,r=Object.getOwnPropertySymbols(n);i<r.length;i++)e.indexOf(r[i])<0&&Object.prototype.propertyIsEnumerable.call(n,r[i])&&(t[r[i]]=n[r[i]]);return t}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Iv={PHONE:"phone",TOTP:"totp"},Tv={FACEBOOK:"facebook.com",GITHUB:"github.com",GOOGLE:"google.com",PASSWORD:"password",PHONE:"phone",TWITTER:"twitter.com"},Ev={EMAIL_LINK:"emailLink",EMAIL_PASSWORD:"password",FACEBOOK:"facebook.com",GITHUB:"github.com",GOOGLE:"google.com",PHONE:"phone",TWITTER:"twitter.com"},vv={LINK:"link",REAUTHENTICATE:"reauthenticate",SIGN_IN:"signIn"},wv={EMAIL_SIGNIN:"EMAIL_SIGNIN",PASSWORD_RESET:"PASSWORD_RESET",RECOVER_EMAIL:"RECOVER_EMAIL",REVERT_SECOND_FACTOR_ADDITION:"REVERT_SECOND_FACTOR_ADDITION",VERIFY_AND_CHANGE_EMAIL:"VERIFY_AND_CHANGE_EMAIL",VERIFY_EMAIL:"VERIFY_EMAIL"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Av(){return{"admin-restricted-operation":"This operation is restricted to administrators only.","argument-error":"","app-not-authorized":"This app, identified by the domain where it's hosted, is not authorized to use Firebase Authentication with the provided API key. Review your key configuration in the Google API console.","app-not-installed":"The requested mobile application corresponding to the identifier (Android package name or iOS bundle ID) provided is not installed on this device.","captcha-check-failed":"The reCAPTCHA response token provided is either invalid, expired, already used or the domain associated with it does not match the list of whitelisted domains.","code-expired":"The SMS code has expired. Please re-send the verification code to try again.","cordova-not-ready":"Cordova framework is not ready.","cors-unsupported":"This browser is not supported.","credential-already-in-use":"This credential is already associated with a different user account.","custom-token-mismatch":"The custom token corresponds to a different audience.","requires-recent-login":"This operation is sensitive and requires recent authentication. Log in again before retrying this request.","dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK.","dynamic-link-not-activated":"Please activate Dynamic Links in the Firebase Console and agree to the terms and conditions.","email-change-needs-verification":"Multi-factor users must always have a verified email.","email-already-in-use":"The email address is already in use by another account.","emulator-config-failed":'Auth instance has already been used to make a network call. Auth can no longer be configured to use the emulator. Try calling "connectAuthEmulator()" sooner.',"expired-action-code":"The action code has expired.","cancelled-popup-request":"This operation has been cancelled due to another conflicting popup being opened.","internal-error":"An internal AuthError has occurred.","invalid-app-credential":"The phone verification request contains an invalid application verifier. The reCAPTCHA token response is either invalid or expired.","invalid-app-id":"The mobile app identifier is not registered for the current project.","invalid-user-token":"This user's credential isn't valid for this project. This can happen if the user's token has been tampered with, or if the user isn't for the project associated with this API key.","invalid-auth-event":"An internal AuthError has occurred.","invalid-verification-code":"The SMS verification code used to create the phone auth credential is invalid. Please resend the verification code sms and be sure to use the verification code provided by the user.","invalid-continue-uri":"The continue URL provided in the request is invalid.","invalid-cordova-configuration":"The following Cordova plugins must be installed to enable OAuth sign-in: cordova-plugin-buildinfo, cordova-universal-links-plugin, cordova-plugin-browsertab, cordova-plugin-inappbrowser and cordova-plugin-customurlscheme.","invalid-custom-token":"The custom token format is incorrect. Please check the documentation.","invalid-dynamic-link-domain":"The provided dynamic link domain is not configured or authorized for the current project.","invalid-email":"The email address is badly formatted.","invalid-emulator-scheme":"Emulator URL must start with a valid scheme (http:// or https://).","invalid-api-key":"Your API key is invalid, please check you have copied it correctly.","invalid-cert-hash":"The SHA-1 certificate hash provided is invalid.","invalid-credential":"The supplied auth credential is incorrect, malformed or has expired.","invalid-message-payload":"The email template corresponding to this action contains invalid characters in its message. Please fix by going to the Auth email templates section in the Firebase Console.","invalid-multi-factor-session":"The request does not contain a valid proof of first factor successful sign-in.","invalid-oauth-provider":"EmailAuthProvider is not supported for this operation. This operation only supports OAuth providers.","invalid-oauth-client-id":"The OAuth client ID provided is either invalid or does not match the specified API key.","unauthorized-domain":"This domain is not authorized for OAuth operations for your Firebase project. Edit the list of authorized domains from the Firebase console.","invalid-action-code":"The action code is invalid. This can happen if the code is malformed, expired, or has already been used.","wrong-password":"The password is invalid or the user does not have a password.","invalid-persistence-type":"The specified persistence type is invalid. It can only be local, session or none.","invalid-phone-number":"The format of the phone number provided is incorrect. Please enter the phone number in a format that can be parsed into E.164 format. E.164 phone numbers are written in the format [+][country code][subscriber number including area code].","invalid-provider-id":"The specified provider ID is invalid.","invalid-recipient-email":"The email corresponding to this action failed to send as the provided recipient email address is invalid.","invalid-sender":"The email template corresponding to this action contains an invalid sender email or name. Please fix by going to the Auth email templates section in the Firebase Console.","invalid-verification-id":"The verification ID used to create the phone auth credential is invalid.","invalid-tenant-id":"The Auth instance's tenant ID is invalid.","login-blocked":"Login blocked by user-provided method: {$originalMessage}","missing-android-pkg-name":"An Android Package Name must be provided if the Android App is required to be installed.","auth-domain-config-required":"Be sure to include authDomain when calling firebase.initializeApp(), by following the instructions in the Firebase console.","missing-app-credential":"The phone verification request is missing an application verifier assertion. A reCAPTCHA response token needs to be provided.","missing-verification-code":"The phone auth credential was created with an empty SMS verification code.","missing-continue-uri":"A continue URL must be provided in the request.","missing-iframe-start":"An internal AuthError has occurred.","missing-ios-bundle-id":"An iOS Bundle ID must be provided if an App Store ID is provided.","missing-or-invalid-nonce":"The request does not contain a valid nonce. This can occur if the SHA-256 hash of the provided raw nonce does not match the hashed nonce in the ID token payload.","missing-password":"A non-empty password must be provided","missing-multi-factor-info":"No second factor identifier is provided.","missing-multi-factor-session":"The request is missing proof of first factor successful sign-in.","missing-phone-number":"To send verification codes, provide a phone number for the recipient.","missing-verification-id":"The phone auth credential was created with an empty verification ID.","app-deleted":"This instance of FirebaseApp has been deleted.","multi-factor-info-not-found":"The user does not have a second factor matching the identifier provided.","multi-factor-auth-required":"Proof of ownership of a second factor is required to complete sign-in.","account-exists-with-different-credential":"An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.","network-request-failed":"A network AuthError (such as timeout, interrupted connection or unreachable host) has occurred.","no-auth-event":"An internal AuthError has occurred.","no-such-provider":"User was not linked to an account with the given provider.","null-user":"A null user object was provided as the argument for an operation which requires a non-null user object.","operation-not-allowed":"The given sign-in provider is disabled for this Firebase project. Enable it in the Firebase console, under the sign-in method tab of the Auth section.","operation-not-supported-in-this-environment":'This operation is not supported in the environment this application is running on. "location.protocol" must be http, https or chrome-extension and web storage must be enabled.',"popup-blocked":"Unable to establish a connection with the popup. It may have been blocked by the browser.","popup-closed-by-user":"The popup has been closed by the user before finalizing the operation.","provider-already-linked":"User can only be linked to one identity for the given provider.","quota-exceeded":"The project's quota for this operation has been exceeded.","redirect-cancelled-by-user":"The redirect operation has been cancelled by the user before finalizing.","redirect-operation-pending":"A redirect sign-in operation is already pending.","rejected-credential":"The request contains malformed or mismatching credentials.","second-factor-already-in-use":"The second factor is already enrolled on this account.","maximum-second-factor-count-exceeded":"The maximum allowed number of second factors on a user has been exceeded.","tenant-id-mismatch":"The provided tenant ID does not match the Auth instance's tenant ID",timeout:"The operation has timed out.","user-token-expired":"The user's credential is no longer valid. The user must sign in again.","too-many-requests":"We have blocked all requests from this device due to unusual activity. Try again later.","unauthorized-continue-uri":"The domain of the continue URL is not whitelisted.  Please whitelist the domain in the Firebase console.","unsupported-first-factor":"Enrolling a second factor or signing in with a multi-factor account requires sign-in with a supported first factor.","unsupported-persistence-type":"The current environment does not support the specified persistence type.","unsupported-tenant-operation":"This operation is not supported in a multi-tenant context.","unverified-email":"The operation requires a verified email.","user-cancelled":"The user did not grant your application the permissions it requested.","user-not-found":"There is no user record corresponding to this identifier. The user may have been deleted.","user-disabled":"The user account has been disabled by an administrator.","user-mismatch":"The supplied credentials do not correspond to the previously signed in user.","user-signed-out":"","weak-password":"The password must be 6 characters long or more.","web-storage-unsupported":"This browser is not supported or 3rd party cookies and data may be disabled.","already-initialized":"initializeAuth() has already been called with different options. To avoid this error, call initializeAuth() with the same options as when it was originally called, or call getAuth() to return the already initialized instance.","missing-recaptcha-token":"The reCAPTCHA token is missing when sending request to the backend.","invalid-recaptcha-token":"The reCAPTCHA token is invalid when sending request to the backend.","invalid-recaptcha-action":"The reCAPTCHA action is invalid when sending request to the backend.","recaptcha-not-enabled":"reCAPTCHA Enterprise integration is not enabled for this project.","missing-client-type":"The reCAPTCHA client type is missing when sending request to the backend.","missing-recaptcha-version":"The reCAPTCHA version is missing when sending request to the backend.","invalid-req-type":"Invalid request parameters.","invalid-recaptcha-version":"The reCAPTCHA version is invalid when sending request to the backend.","unsupported-password-policy-schema-version":"The password policy received from the backend uses a schema version that is not supported by this version of the Firebase SDK.","password-does-not-meet-requirements":"The password does not meet the requirements.","invalid-hosting-link-domain":"The provided Hosting link domain is not configured in Firebase Hosting or is not owned by the current project. This cannot be a default Hosting domain (`web.app` or `firebaseapp.com`)."}}function gm(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const bv=Av,_m=gm,ym=new yr("auth","Firebase",gm()),Rv={ADMIN_ONLY_OPERATION:"auth/admin-restricted-operation",ARGUMENT_ERROR:"auth/argument-error",APP_NOT_AUTHORIZED:"auth/app-not-authorized",APP_NOT_INSTALLED:"auth/app-not-installed",CAPTCHA_CHECK_FAILED:"auth/captcha-check-failed",CODE_EXPIRED:"auth/code-expired",CORDOVA_NOT_READY:"auth/cordova-not-ready",CORS_UNSUPPORTED:"auth/cors-unsupported",CREDENTIAL_ALREADY_IN_USE:"auth/credential-already-in-use",CREDENTIAL_MISMATCH:"auth/custom-token-mismatch",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"auth/requires-recent-login",DEPENDENT_SDK_INIT_BEFORE_AUTH:"auth/dependent-sdk-initialized-before-auth",DYNAMIC_LINK_NOT_ACTIVATED:"auth/dynamic-link-not-activated",EMAIL_CHANGE_NEEDS_VERIFICATION:"auth/email-change-needs-verification",EMAIL_EXISTS:"auth/email-already-in-use",EMULATOR_CONFIG_FAILED:"auth/emulator-config-failed",EXPIRED_OOB_CODE:"auth/expired-action-code",EXPIRED_POPUP_REQUEST:"auth/cancelled-popup-request",INTERNAL_ERROR:"auth/internal-error",INVALID_API_KEY:"auth/invalid-api-key",INVALID_APP_CREDENTIAL:"auth/invalid-app-credential",INVALID_APP_ID:"auth/invalid-app-id",INVALID_AUTH:"auth/invalid-user-token",INVALID_AUTH_EVENT:"auth/invalid-auth-event",INVALID_CERT_HASH:"auth/invalid-cert-hash",INVALID_CODE:"auth/invalid-verification-code",INVALID_CONTINUE_URI:"auth/invalid-continue-uri",INVALID_CORDOVA_CONFIGURATION:"auth/invalid-cordova-configuration",INVALID_CUSTOM_TOKEN:"auth/invalid-custom-token",INVALID_DYNAMIC_LINK_DOMAIN:"auth/invalid-dynamic-link-domain",INVALID_EMAIL:"auth/invalid-email",INVALID_EMULATOR_SCHEME:"auth/invalid-emulator-scheme",INVALID_IDP_RESPONSE:"auth/invalid-credential",INVALID_LOGIN_CREDENTIALS:"auth/invalid-credential",INVALID_MESSAGE_PAYLOAD:"auth/invalid-message-payload",INVALID_MFA_SESSION:"auth/invalid-multi-factor-session",INVALID_OAUTH_CLIENT_ID:"auth/invalid-oauth-client-id",INVALID_OAUTH_PROVIDER:"auth/invalid-oauth-provider",INVALID_OOB_CODE:"auth/invalid-action-code",INVALID_ORIGIN:"auth/unauthorized-domain",INVALID_PASSWORD:"auth/wrong-password",INVALID_PERSISTENCE:"auth/invalid-persistence-type",INVALID_PHONE_NUMBER:"auth/invalid-phone-number",INVALID_PROVIDER_ID:"auth/invalid-provider-id",INVALID_RECIPIENT_EMAIL:"auth/invalid-recipient-email",INVALID_SENDER:"auth/invalid-sender",INVALID_SESSION_INFO:"auth/invalid-verification-id",INVALID_TENANT_ID:"auth/invalid-tenant-id",MFA_INFO_NOT_FOUND:"auth/multi-factor-info-not-found",MFA_REQUIRED:"auth/multi-factor-auth-required",MISSING_ANDROID_PACKAGE_NAME:"auth/missing-android-pkg-name",MISSING_APP_CREDENTIAL:"auth/missing-app-credential",MISSING_AUTH_DOMAIN:"auth/auth-domain-config-required",MISSING_CODE:"auth/missing-verification-code",MISSING_CONTINUE_URI:"auth/missing-continue-uri",MISSING_IFRAME_START:"auth/missing-iframe-start",MISSING_IOS_BUNDLE_ID:"auth/missing-ios-bundle-id",MISSING_OR_INVALID_NONCE:"auth/missing-or-invalid-nonce",MISSING_MFA_INFO:"auth/missing-multi-factor-info",MISSING_MFA_SESSION:"auth/missing-multi-factor-session",MISSING_PHONE_NUMBER:"auth/missing-phone-number",MISSING_SESSION_INFO:"auth/missing-verification-id",MODULE_DESTROYED:"auth/app-deleted",NEED_CONFIRMATION:"auth/account-exists-with-different-credential",NETWORK_REQUEST_FAILED:"auth/network-request-failed",NULL_USER:"auth/null-user",NO_AUTH_EVENT:"auth/no-auth-event",NO_SUCH_PROVIDER:"auth/no-such-provider",OPERATION_NOT_ALLOWED:"auth/operation-not-allowed",OPERATION_NOT_SUPPORTED:"auth/operation-not-supported-in-this-environment",POPUP_BLOCKED:"auth/popup-blocked",POPUP_CLOSED_BY_USER:"auth/popup-closed-by-user",PROVIDER_ALREADY_LINKED:"auth/provider-already-linked",QUOTA_EXCEEDED:"auth/quota-exceeded",REDIRECT_CANCELLED_BY_USER:"auth/redirect-cancelled-by-user",REDIRECT_OPERATION_PENDING:"auth/redirect-operation-pending",REJECTED_CREDENTIAL:"auth/rejected-credential",SECOND_FACTOR_ALREADY_ENROLLED:"auth/second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"auth/maximum-second-factor-count-exceeded",TENANT_ID_MISMATCH:"auth/tenant-id-mismatch",TIMEOUT:"auth/timeout",TOKEN_EXPIRED:"auth/user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"auth/too-many-requests",UNAUTHORIZED_DOMAIN:"auth/unauthorized-continue-uri",UNSUPPORTED_FIRST_FACTOR:"auth/unsupported-first-factor",UNSUPPORTED_PERSISTENCE:"auth/unsupported-persistence-type",UNSUPPORTED_TENANT_OPERATION:"auth/unsupported-tenant-operation",UNVERIFIED_EMAIL:"auth/unverified-email",USER_CANCELLED:"auth/user-cancelled",USER_DELETED:"auth/user-not-found",USER_DISABLED:"auth/user-disabled",USER_MISMATCH:"auth/user-mismatch",USER_SIGNED_OUT:"auth/user-signed-out",WEAK_PASSWORD:"auth/weak-password",WEB_STORAGE_UNSUPPORTED:"auth/web-storage-unsupported",ALREADY_INITIALIZED:"auth/already-initialized",RECAPTCHA_NOT_ENABLED:"auth/recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"auth/missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"auth/invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"auth/invalid-recaptcha-action",MISSING_CLIENT_TYPE:"auth/missing-client-type",MISSING_RECAPTCHA_VERSION:"auth/missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"auth/invalid-recaptcha-version",INVALID_REQ_TYPE:"auth/invalid-req-type",INVALID_HOSTING_LINK_DOMAIN:"auth/invalid-hosting-link-domain"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ea=new Sa("@firebase/auth");function Sv(n,...e){ea.logLevel<=X.WARN&&ea.warn(`Auth (${Ir}): ${n}`,...e)}function Mo(n,...e){ea.logLevel<=X.ERROR&&ea.error(`Auth (${Ir}): ${n}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function st(n,...e){throw Zu(n,...e)}function Ye(n,...e){return Zu(n,...e)}function Xu(n,e,t){const r=Object.assign(Object.assign({},_m()),{[e]:t});return new yr("auth","Firebase",r).create(e,{appName:n.name})}function Ve(n){return Xu(n,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function pi(n,e,t){const r=t;if(!(e instanceof r))throw r.name!==e.constructor.name&&st(n,"argument-error"),Xu(n,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function Zu(n,...e){if(typeof n!="string"){const t=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=n.name),n._errorFactory.create(t,...r)}return ym.create(n,...e)}function O(n,e,...t){if(!n)throw Zu(e,...t)}function At(n){const e="INTERNAL ASSERTION FAILED: "+n;throw Mo(e),new Error(e)}function Kt(n,e){n||At(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function As(){var n;return typeof self<"u"&&((n=self.location)===null||n===void 0?void 0:n.href)||""}function el(){return Kd()==="http:"||Kd()==="https:"}function Kd(){var n;return typeof self<"u"&&((n=self.location)===null||n===void 0?void 0:n.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pv(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(el()||Hu()||"connection"in navigator)?navigator.onLine:!0}function Cv(){if(typeof navigator>"u")return null;const n=navigator;return n.languages&&n.languages[0]||n.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qs{constructor(e,t){this.shortDelay=e,this.longDelay=t,Kt(t>e,"Short delay should be less than long delay!"),this.isMobile=WT()||QT()}get(){return Pv()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function tl(n,e){Kt(n.emulator,"Emulator should always be set here");const{url:t}=n.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Im{static initialize(e,t,r){this.fetchImpl=e,t&&(this.headersImpl=t),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;At("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;At("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;At("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kv={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Dv=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],Nv=new qs(3e4,6e4);function de(n,e){return n.tenantId&&!e.tenantId?Object.assign(Object.assign({},e),{tenantId:n.tenantId}):e}async function fe(n,e,t,r,i={}){return Tm(n,i,async()=>{let s={},o={};r&&(e==="GET"?o=r:s={body:JSON.stringify(r)});const c=fi(Object.assign({key:n.config.apiKey},o)).slice(1),u=await n._getAdditionalHeaders();u["Content-Type"]="application/json",n.languageCode&&(u["X-Firebase-Locale"]=n.languageCode);const l=Object.assign({method:e,headers:u},s);return HT()||(l.referrerPolicy="no-referrer"),n.emulatorConfig&&Yt(n.emulatorConfig.host)&&(l.credentials="include"),Im.fetch()(await Em(n,n.config.apiHost,t,c),l)})}async function Tm(n,e,t){n._canInitEmulator=!1;const r=Object.assign(Object.assign({},kv),e);try{const i=new Ov(n),s=await Promise.race([t(),i.promise]);i.clearNetworkTimeout();const o=await s.json();if("needConfirmation"in o)throw ns(n,"account-exists-with-different-credential",o);if(s.ok&&!("errorMessage"in o))return o;{const c=s.ok?o.errorMessage:o.error.message,[u,l]=c.split(" : ");if(u==="FEDERATED_USER_ID_ALREADY_LINKED")throw ns(n,"credential-already-in-use",o);if(u==="EMAIL_EXISTS")throw ns(n,"email-already-in-use",o);if(u==="USER_DISABLED")throw ns(n,"user-disabled",o);const d=r[u]||u.toLowerCase().replace(/[_\s]+/g,"-");if(l)throw Xu(n,d,l);st(n,d)}}catch(i){if(i instanceof mt)throw i;st(n,"network-request-failed",{message:String(i)})}}async function Jt(n,e,t,r,i={}){const s=await fe(n,e,t,r,i);return"mfaPendingCredential"in s&&st(n,"multi-factor-auth-required",{_serverResponse:s}),s}async function Em(n,e,t,r){const i=`${e}${t}?${r}`,s=n,o=s.config.emulator?tl(n.config,i):`${n.config.apiScheme}://${i}`;return Dv.includes(t)&&(await s._persistenceManagerAvailable,s._getPersistenceType()==="COOKIE")?s._getPersistence()._getFinalTarget(o).toString():o}function Vv(n){switch(n){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class Ov{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,r)=>{this.timer=setTimeout(()=>r(Ye(this.auth,"network-request-failed")),Nv.get())})}}function ns(n,e,t){const r={appName:n.name};t.email&&(r.email=t.email),t.phoneNumber&&(r.phoneNumber=t.phoneNumber);const i=Ye(n,e,r);return i.customData._tokenResponse=t,i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Wd(n){return n!==void 0&&n.getResponse!==void 0}function Hd(n){return n!==void 0&&n.enterprise!==void 0}class vm{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return Vv(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function xv(n){return(await fe(n,"GET","/v1/recaptchaParams")).recaptchaSiteKey||""}async function wm(n,e){return fe(n,"GET","/v2/recaptchaConfig",de(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Lv(n,e){return fe(n,"POST","/v1/accounts:delete",e)}async function Mv(n,e){return fe(n,"POST","/v1/accounts:update",e)}async function ta(n,e){return fe(n,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function cs(n){if(n)try{const e=new Date(Number(n));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Fv(n,e=!1){return j(n).getIdToken(e)}async function Am(n,e=!1){const t=j(n),r=await t.getIdToken(e),i=Ca(r);O(i&&i.exp&&i.auth_time&&i.iat,t.auth,"internal-error");const s=typeof i.firebase=="object"?i.firebase:void 0,o=s==null?void 0:s.sign_in_provider;return{claims:i,token:r,authTime:cs($c(i.auth_time)),issuedAtTime:cs($c(i.iat)),expirationTime:cs($c(i.exp)),signInProvider:o||null,signInSecondFactor:(s==null?void 0:s.sign_in_second_factor)||null}}function $c(n){return Number(n)*1e3}function Ca(n){const[e,t,r]=n.split(".");if(e===void 0||t===void 0||r===void 0)return Mo("JWT malformed, contained fewer than 3 sections"),null;try{const i=em(t);return i?JSON.parse(i):(Mo("Failed to decode base64 JWT payload"),null)}catch(i){return Mo("Caught error parsing JWT payload as JSON",i==null?void 0:i.toString()),null}}function Qd(n){const e=Ca(n);return O(e,"internal-error"),O(typeof e.exp<"u","internal-error"),O(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Wt(n,e,t=!1){if(t)return e;try{return await e}catch(r){throw r instanceof mt&&Uv(r)&&n.auth.currentUser===n&&await n.auth.signOut(),r}}function Uv({code:n}){return n==="auth/user-disabled"||n==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bv{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){var t;if(e){const r=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),r}else{this.errorBackoff=3e4;const i=((t=this.user.stsTokenManager.expirationTime)!==null&&t!==void 0?t:0)-Date.now()-3e5;return Math.max(0,i)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fu{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=cs(this.lastLoginAt),this.creationTime=cs(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function bs(n){var e;const t=n.auth,r=await n.getIdToken(),i=await Wt(n,ta(t,{idToken:r}));O(i==null?void 0:i.users.length,t,"internal-error");const s=i.users[0];n._notifyReloadListener(s);const o=!((e=s.providerUserInfo)===null||e===void 0)&&e.length?Rm(s.providerUserInfo):[],c=qv(n.providerData,o),u=n.isAnonymous,l=!(n.email&&s.passwordHash)&&!(c!=null&&c.length),d=u?l:!1,p={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:c,metadata:new fu(s.createdAt,s.lastLoginAt),isAnonymous:d};Object.assign(n,p)}async function bm(n){const e=j(n);await bs(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function qv(n,e){return[...n.filter(r=>!e.some(i=>i.providerId===r.providerId)),...e]}function Rm(n){return n.map(e=>{var{providerId:t}=e,r=Ju(e,["providerId"]);return{providerId:t,uid:r.rawId||"",displayName:r.displayName||null,email:r.email||null,phoneNumber:r.phoneNumber||null,photoURL:r.photoUrl||null}})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function jv(n,e){const t=await Tm(n,{},async()=>{const r=fi({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:i,apiKey:s}=n.config,o=await Em(n,i,"/v1/token",`key=${s}`),c=await n._getAdditionalHeaders();c["Content-Type"]="application/x-www-form-urlencoded";const u={method:"POST",headers:c,body:r};return n.emulatorConfig&&Yt(n.emulatorConfig.host)&&(u.credentials="include"),Im.fetch()(o,u)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function $v(n,e){return fe(n,"POST","/v2/accounts:revokeToken",de(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Br{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){O(e.idToken,"internal-error"),O(typeof e.idToken<"u","internal-error"),O(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):Qd(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){O(e.length!==0,"internal-error");const t=Qd(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(O(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:r,refreshToken:i,expiresIn:s}=await jv(e,t);this.updateTokensAndExpiration(r,i,Number(s))}updateTokensAndExpiration(e,t,r){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,t){const{refreshToken:r,accessToken:i,expirationTime:s}=t,o=new Br;return r&&(O(typeof r=="string","internal-error",{appName:e}),o.refreshToken=r),i&&(O(typeof i=="string","internal-error",{appName:e}),o.accessToken=i),s&&(O(typeof s=="number","internal-error",{appName:e}),o.expirationTime=s),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new Br,this.toJSON())}_performRefresh(){return At("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function cn(n,e){O(typeof n=="string"||typeof n>"u","internal-error",{appName:e})}class yt{constructor(e){var{uid:t,auth:r,stsTokenManager:i}=e,s=Ju(e,["uid","auth","stsTokenManager"]);this.providerId="firebase",this.proactiveRefresh=new Bv(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=t,this.auth=r,this.stsTokenManager=i,this.accessToken=i.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new fu(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const t=await Wt(this,this.stsTokenManager.getToken(this.auth,e));return O(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return Am(this,e)}reload(){return bm(this)}_assign(e){this!==e&&(O(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>Object.assign({},t)),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new yt(Object.assign(Object.assign({},this),{auth:e,stsTokenManager:this.stsTokenManager._clone()}));return t.metadata._copy(this.metadata),t}_onReload(e){O(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),t&&await bs(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(me(this.auth.app))return Promise.reject(Ve(this.auth));const e=await this.getIdToken();return await Wt(this,Lv(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return Object.assign(Object.assign({uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>Object.assign({},e)),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId},this.metadata.toJSON()),{apiKey:this.auth.config.apiKey,appName:this.auth.name})}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){var r,i,s,o,c,u,l,d;const p=(r=t.displayName)!==null&&r!==void 0?r:void 0,m=(i=t.email)!==null&&i!==void 0?i:void 0,T=(s=t.phoneNumber)!==null&&s!==void 0?s:void 0,P=(o=t.photoURL)!==null&&o!==void 0?o:void 0,D=(c=t.tenantId)!==null&&c!==void 0?c:void 0,k=(u=t._redirectEventId)!==null&&u!==void 0?u:void 0,U=(l=t.createdAt)!==null&&l!==void 0?l:void 0,B=(d=t.lastLoginAt)!==null&&d!==void 0?d:void 0,{uid:M,emailVerified:G,isAnonymous:J,providerData:W,stsTokenManager:E}=t;O(M&&E,e,"internal-error");const _=Br.fromJSON(this.name,E);O(typeof M=="string",e,"internal-error"),cn(p,e.name),cn(m,e.name),O(typeof G=="boolean",e,"internal-error"),O(typeof J=="boolean",e,"internal-error"),cn(T,e.name),cn(P,e.name),cn(D,e.name),cn(k,e.name),cn(U,e.name),cn(B,e.name);const I=new yt({uid:M,auth:e,email:m,emailVerified:G,displayName:p,isAnonymous:J,photoURL:P,phoneNumber:T,tenantId:D,stsTokenManager:_,createdAt:U,lastLoginAt:B});return W&&Array.isArray(W)&&(I.providerData=W.map(v=>Object.assign({},v))),k&&(I._redirectEventId=k),I}static async _fromIdTokenResponse(e,t,r=!1){const i=new Br;i.updateFromServerResponse(t);const s=new yt({uid:t.localId,auth:e,stsTokenManager:i,isAnonymous:r});return await bs(s),s}static async _fromGetAccountInfoResponse(e,t,r){const i=t.users[0];O(i.localId!==void 0,"internal-error");const s=i.providerUserInfo!==void 0?Rm(i.providerUserInfo):[],o=!(i.email&&i.passwordHash)&&!(s!=null&&s.length),c=new Br;c.updateFromIdToken(r);const u=new yt({uid:i.localId,auth:e,stsTokenManager:c,isAnonymous:o}),l={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:s,metadata:new fu(i.createdAt,i.lastLoginAt),isAnonymous:!(i.email&&i.passwordHash)&&!(s!=null&&s.length)};return Object.assign(u,l),u}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Yd=new Map;function Bt(n){Kt(n instanceof Function,"Expected a class definition");let e=Yd.get(n);return e?(Kt(e instanceof n,"Instance stored in cache mismatched with class"),e):(e=new n,Yd.set(n,e),e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sm{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}Sm.type="NONE";const pu=Sm;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Fo(n,e,t){return`firebase:${n}:${e}:${t}`}class qr{constructor(e,t,r){this.persistence=e,this.auth=t,this.userKey=r;const{config:i,name:s}=this.auth;this.fullUserKey=Fo(this.userKey,i.apiKey,s),this.fullPersistenceKey=Fo("persistence",i.apiKey,s),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await ta(this.auth,{idToken:e}).catch(()=>{});return t?yt._fromGetAccountInfoResponse(this.auth,t,e):null}return yt._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,r="authUser"){if(!t.length)return new qr(Bt(pu),e,r);const i=(await Promise.all(t.map(async l=>{if(await l._isAvailable())return l}))).filter(l=>l);let s=i[0]||Bt(pu);const o=Fo(r,e.config.apiKey,e.name);let c=null;for(const l of t)try{const d=await l._get(o);if(d){let p;if(typeof d=="string"){const m=await ta(e,{idToken:d}).catch(()=>{});if(!m)break;p=await yt._fromGetAccountInfoResponse(e,m,d)}else p=yt._fromJSON(e,d);l!==s&&(c=p),s=l;break}}catch{}const u=i.filter(l=>l._shouldAllowMigration);return!s._shouldAllowMigration||!u.length?new qr(s,e,r):(s=u[0],c&&await s._set(o,c.toJSON()),await Promise.all(t.map(async l=>{if(l!==s)try{await l._remove(o)}catch{}})),new qr(s,e,r))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Jd(n){const e=n.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Dm(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(Pm(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(Vm(e))return"Blackberry";if(Om(e))return"Webos";if(Cm(e))return"Safari";if((e.includes("chrome/")||km(e))&&!e.includes("edge/"))return"Chrome";if(Nm(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=n.match(t);if((r==null?void 0:r.length)===2)return r[1]}return"Other"}function Pm(n=Pe()){return/firefox\//i.test(n)}function Cm(n=Pe()){const e=n.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function km(n=Pe()){return/crios\//i.test(n)}function Dm(n=Pe()){return/iemobile/i.test(n)}function Nm(n=Pe()){return/android/i.test(n)}function Vm(n=Pe()){return/blackberry/i.test(n)}function Om(n=Pe()){return/webos/i.test(n)}function nl(n=Pe()){return/iphone|ipad|ipod/i.test(n)||/macintosh/i.test(n)&&/mobile/i.test(n)}function zv(n=Pe()){var e;return nl(n)&&!!(!((e=window.navigator)===null||e===void 0)&&e.standalone)}function Gv(){return YT()&&document.documentMode===10}function xm(n=Pe()){return nl(n)||Nm(n)||Om(n)||Vm(n)||/windows phone/i.test(n)||Dm(n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Lm(n,e=[]){let t;switch(n){case"Browser":t=Jd(Pe());break;case"Worker":t=`${Jd(Pe())}-${n}`;break;default:t=n}const r=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${Ir}/${r}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kv{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const r=s=>new Promise((o,c)=>{try{const u=e(s);o(u)}catch(u){c(u)}});r.onAbort=t,this.queue.push(r);const i=this.queue.length-1;return()=>{this.queue[i]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const r of this.queue)await r(e),r.onAbort&&t.push(r.onAbort)}catch(r){t.reverse();for(const i of t)try{i()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r==null?void 0:r.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Wv(n,e={}){return fe(n,"GET","/v2/passwordPolicy",de(n,e))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Hv=6;class Qv{constructor(e){var t,r,i,s;const o=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=(t=o.minPasswordLength)!==null&&t!==void 0?t:Hv,o.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=o.maxPasswordLength),o.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=o.containsLowercaseCharacter),o.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=o.containsUppercaseCharacter),o.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=o.containsNumericCharacter),o.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=o.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=(i=(r=e.allowedNonAlphanumericCharacters)===null||r===void 0?void 0:r.join(""))!==null&&i!==void 0?i:"",this.forceUpgradeOnSignin=(s=e.forceUpgradeOnSignin)!==null&&s!==void 0?s:!1,this.schemaVersion=e.schemaVersion}validatePassword(e){var t,r,i,s,o,c;const u={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,u),this.validatePasswordCharacterOptions(e,u),u.isValid&&(u.isValid=(t=u.meetsMinPasswordLength)!==null&&t!==void 0?t:!0),u.isValid&&(u.isValid=(r=u.meetsMaxPasswordLength)!==null&&r!==void 0?r:!0),u.isValid&&(u.isValid=(i=u.containsLowercaseLetter)!==null&&i!==void 0?i:!0),u.isValid&&(u.isValid=(s=u.containsUppercaseLetter)!==null&&s!==void 0?s:!0),u.isValid&&(u.isValid=(o=u.containsNumericCharacter)!==null&&o!==void 0?o:!0),u.isValid&&(u.isValid=(c=u.containsNonAlphanumericCharacter)!==null&&c!==void 0?c:!0),u}validatePasswordLengthOptions(e,t){const r=this.customStrengthOptions.minPasswordLength,i=this.customStrengthOptions.maxPasswordLength;r&&(t.meetsMinPasswordLength=e.length>=r),i&&(t.meetsMaxPasswordLength=e.length<=i)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let r;for(let i=0;i<e.length;i++)r=e.charAt(i),this.updatePasswordCharacterOptionsStatuses(t,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,t,r,i,s){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=i)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yv{constructor(e,t,r,i){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=r,this.config=i,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Xd(this),this.idTokenSubscription=new Xd(this),this.beforeStateQueue=new Kv(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=ym,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=i.sdkClientVersion,this._persistenceManagerAvailable=new Promise(s=>this._resolvePersistenceManagerAvailable=s)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=Bt(t)),this._initializationPromise=this.queue(async()=>{var r,i,s;if(!this._deleted&&(this.persistenceManager=await qr.create(this,e),(r=this._resolvePersistenceManagerAvailable)===null||r===void 0||r.call(this),!this._deleted)){if(!((i=this._popupRedirectResolver)===null||i===void 0)&&i._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((s=this.currentUser)===null||s===void 0?void 0:s.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await ta(this,{idToken:e}),r=await yt._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(r)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var t;if(me(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(c=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(c,c))}):this.directlySetCurrentUser(null)}const r=await this.assertedPersistence.getCurrentUser();let i=r,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(t=this.redirectUser)===null||t===void 0?void 0:t._redirectEventId,c=i==null?void 0:i._redirectEventId,u=await this.tryRedirectSignIn(e);(!o||o===c)&&(u!=null&&u.user)&&(i=u.user,s=!0)}if(!i)return this.directlySetCurrentUser(null);if(!i._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(i)}catch(o){i=r,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return i?this.reloadAndSetCurrentUserOrClear(i):this.directlySetCurrentUser(null)}return O(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===i._redirectEventId?this.directlySetCurrentUser(i):this.reloadAndSetCurrentUserOrClear(i)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await bs(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=Cv()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(me(this.app))return Promise.reject(Ve(this));const t=e?j(e):null;return t&&O(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&O(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return me(this.app)?Promise.reject(Ve(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return me(this.app)?Promise.reject(Ve(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(Bt(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await Wv(this),t=new Qv(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new yr("auth","Firebase",e())}onAuthStateChanged(e,t,r){return this.registerStateListener(this.authStateSubscription,e,t,r)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,r){return this.registerStateListener(this.idTokenSubscription,e,t,r)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const r=this.onAuthStateChanged(()=>{r(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(r.tenantId=this.tenantId),await $v(this,r)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)===null||e===void 0?void 0:e.toJSON()}}async _setRedirectUser(e,t){const r=await this.getOrInitRedirectPersistenceManager(t);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&Bt(e)||this._popupRedirectResolver;O(t,this,"argument-error"),this.redirectPersistenceManager=await qr.create(this,[Bt(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,r;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)===null||t===void 0?void 0:t._redirectEventId)===e?this._currentUser:((r=this.redirectUser)===null||r===void 0?void 0:r._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var e,t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const r=(t=(e=this.currentUser)===null||e===void 0?void 0:e.uid)!==null&&t!==void 0?t:null;this.lastNotifiedUid!==r&&(this.lastNotifiedUid=r,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,r,i){if(this._deleted)return()=>{};const s=typeof t=="function"?t:t.next.bind(t);let o=!1;const c=this._isInitialized?Promise.resolve():this._initializationPromise;if(O(c,this,"internal-error"),c.then(()=>{o||s(this.currentUser)}),typeof t=="function"){const u=e.addObserver(t,r,i);return()=>{o=!0,u()}}else{const u=e.addObserver(t);return()=>{o=!0,u()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return O(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=Lm(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var e;const t={"X-Client-Version":this.clientVersion};this.app.options.appId&&(t["X-Firebase-gmpid"]=this.app.options.appId);const r=await((e=this.heartbeatServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getHeartbeatsHeader());r&&(t["X-Firebase-Client"]=r);const i=await this._getAppCheckToken();return i&&(t["X-Firebase-AppCheck"]=i),t}async _getAppCheckToken(){var e;if(me(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const t=await((e=this.appCheckServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getToken());return t!=null&&t.error&&Sv(`Error while retrieving App Check token: ${t.error}`),t==null?void 0:t.token}}function Ee(n){return j(n)}class Xd{constructor(e){this.auth=e,this.observer=null,this.addObserver=tE(t=>this.observer=t)}get next(){return O(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let js={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function Jv(n){js=n}function rl(n){return js.loadJS(n)}function Xv(){return js.recaptchaV2Script}function Zv(){return js.recaptchaEnterpriseScript}function ew(){return js.gapiScript}function Mm(n){return`__${n}${Math.floor(Math.random()*1e6)}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tw=500,nw=6e4,bo=1e12;class rw{constructor(e){this.auth=e,this.counter=bo,this._widgets=new Map}render(e,t){const r=this.counter;return this._widgets.set(r,new ow(e,this.auth.name,t||{})),this.counter++,r}reset(e){var t;const r=e||bo;(t=this._widgets.get(r))===null||t===void 0||t.delete(),this._widgets.delete(r)}getResponse(e){var t;const r=e||bo;return((t=this._widgets.get(r))===null||t===void 0?void 0:t.getResponse())||""}async execute(e){var t;const r=e||bo;return(t=this._widgets.get(r))===null||t===void 0||t.execute(),""}}class iw{constructor(){this.enterprise=new sw}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class sw{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class ow{constructor(e,t,r){this.params=r,this.timerId=null,this.deleted=!1,this.responseToken=null,this.clickHandler=()=>{this.execute()};const i=typeof e=="string"?document.getElementById(e):e;O(i,"argument-error",{appName:t}),this.container=i,this.isVisible=this.params.size!=="invisible",this.isVisible?this.execute():this.container.addEventListener("click",this.clickHandler)}getResponse(){return this.checkIfDeleted(),this.responseToken}delete(){this.checkIfDeleted(),this.deleted=!0,this.timerId&&(clearTimeout(this.timerId),this.timerId=null),this.container.removeEventListener("click",this.clickHandler)}execute(){this.checkIfDeleted(),!this.timerId&&(this.timerId=window.setTimeout(()=>{this.responseToken=aw(50);const{callback:e,"expired-callback":t}=this.params;if(e)try{e(this.responseToken)}catch{}this.timerId=window.setTimeout(()=>{if(this.timerId=null,this.responseToken=null,t)try{t()}catch{}this.isVisible&&this.execute()},nw)},tw))}checkIfDeleted(){if(this.deleted)throw new Error("reCAPTCHA mock was already deleted!")}}function aw(n){const e=[],t="1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(let r=0;r<n;r++)e.push(t.charAt(Math.floor(Math.random()*t.length)));return e.join("")}const cw="recaptcha-enterprise",us="NO_RECAPTCHA";class Fm{constructor(e){this.type=cw,this.auth=Ee(e)}async verify(e="verify",t=!1){async function r(s){if(!t){if(s.tenantId==null&&s._agentRecaptchaConfig!=null)return s._agentRecaptchaConfig.siteKey;if(s.tenantId!=null&&s._tenantRecaptchaConfigs[s.tenantId]!==void 0)return s._tenantRecaptchaConfigs[s.tenantId].siteKey}return new Promise(async(o,c)=>{wm(s,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(u=>{if(u.recaptchaKey===void 0)c(new Error("recaptcha Enterprise site key undefined"));else{const l=new vm(u);return s.tenantId==null?s._agentRecaptchaConfig=l:s._tenantRecaptchaConfigs[s.tenantId]=l,o(l.siteKey)}}).catch(u=>{c(u)})})}function i(s,o,c){const u=window.grecaptcha;Hd(u)?u.enterprise.ready(()=>{u.enterprise.execute(s,{action:e}).then(l=>{o(l)}).catch(()=>{o(us)})}):c(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new iw().execute("siteKey",{action:"verify"}):new Promise((s,o)=>{r(this.auth).then(c=>{if(!t&&Hd(window.grecaptcha))i(c,s,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let u=Zv();u.length!==0&&(u+=c),rl(u).then(()=>{i(c,s,o)}).catch(l=>{o(l)})}}).catch(c=>{o(c)})})}}async function Wi(n,e,t,r=!1,i=!1){const s=new Fm(n);let o;if(i)o=us;else try{o=await s.verify(t)}catch{o=await s.verify(t,!0)}const c=Object.assign({},e);if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in c){const u=c.phoneEnrollmentInfo.phoneNumber,l=c.phoneEnrollmentInfo.recaptchaToken;Object.assign(c,{phoneEnrollmentInfo:{phoneNumber:u,recaptchaToken:l,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in c){const u=c.phoneSignInInfo.recaptchaToken;Object.assign(c,{phoneSignInInfo:{recaptchaToken:u,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return c}return r?Object.assign(c,{captchaResp:o}):Object.assign(c,{captchaResponse:o}),Object.assign(c,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(c,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),c}async function In(n,e,t,r,i){var s,o;if(i==="EMAIL_PASSWORD_PROVIDER")if(!((s=n._getRecaptchaConfig())===null||s===void 0)&&s.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const c=await Wi(n,e,t,t==="getOobCode");return r(n,c)}else return r(n,e).catch(async c=>{if(c.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const u=await Wi(n,e,t,t==="getOobCode");return r(n,u)}else return Promise.reject(c)});else if(i==="PHONE_PROVIDER")if(!((o=n._getRecaptchaConfig())===null||o===void 0)&&o.isProviderEnabled("PHONE_PROVIDER")){const c=await Wi(n,e,t);return r(n,c).catch(async u=>{var l;if(((l=n._getRecaptchaConfig())===null||l===void 0?void 0:l.getProviderEnforcementState("PHONE_PROVIDER"))==="AUDIT"&&(u.code==="auth/missing-recaptcha-token"||u.code==="auth/invalid-app-credential")){console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${t} flow.`);const d=await Wi(n,e,t,!1,!0);return r(n,d)}return Promise.reject(u)})}else{const c=await Wi(n,e,t,!1,!0);return r(n,c)}else return Promise.reject(i+" provider is not supported.")}async function Um(n){const e=Ee(n),t=await wm(e,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}),r=new vm(t);e.tenantId==null?e._agentRecaptchaConfig=r:e._tenantRecaptchaConfigs[e.tenantId]=r,r.isAnyProviderEnabled()&&new Fm(e).verify()}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Bm(n,e){const t=Nt(n,"auth");if(t.isInitialized()){const i=t.getImmediate(),s=t.getOptions();if(dt(s,e??{}))return i;st(i,"already-initialized")}return t.initialize({options:e})}function uw(n,e){const t=(e==null?void 0:e.persistence)||[],r=(Array.isArray(t)?t:[t]).map(Bt);e!=null&&e.errorMap&&n._updateErrorMap(e.errorMap),n._initializeWithPersistence(r,e==null?void 0:e.popupRedirectResolver)}function qm(n,e,t){const r=Ee(n);O(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");const i=!!(t!=null&&t.disableWarnings),s=jm(e),{host:o,port:c}=lw(e),u=c===null?"":`:${c}`,l={url:`${s}//${o}${u}/`},d=Object.freeze({host:o,port:c,protocol:s.replace(":",""),options:Object.freeze({disableWarnings:i})});if(!r._canInitEmulator){O(r.config.emulator&&r.emulatorConfig,r,"emulator-config-failed"),O(dt(l,r.config.emulator)&&dt(d,r.emulatorConfig),r,"emulator-config-failed");return}r.config.emulator=l,r.emulatorConfig=d,r.settings.appVerificationDisabledForTesting=!0,Yt(o)?(ba(`${s}//${o}${u}`),Wu("Auth",!0)):i||hw()}function jm(n){const e=n.indexOf(":");return e<0?"":n.substr(0,e+1)}function lw(n){const e=jm(n),t=/(\/\/)?([^?#/]+)/.exec(n.substr(e.length));if(!t)return{host:"",port:null};const r=t[2].split("@").pop()||"",i=/^(\[[^\]]+\])(:|$)/.exec(r);if(i){const s=i[1];return{host:s,port:Zd(r.substr(s.length+1))}}else{const[s,o]=r.split(":");return{host:s,port:Zd(o)}}}function Zd(n){if(!n)return null;const e=Number(n);return isNaN(e)?null:e}function hw(){function n(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",n):n())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mi{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return At("not implemented")}_getIdTokenResponse(e){return At("not implemented")}_linkToIdToken(e,t){return At("not implemented")}_getReauthenticationResolver(e){return At("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function $m(n,e){return fe(n,"POST","/v1/accounts:resetPassword",de(n,e))}async function dw(n,e){return fe(n,"POST","/v1/accounts:update",e)}async function fw(n,e){return fe(n,"POST","/v1/accounts:signUp",e)}async function pw(n,e){return fe(n,"POST","/v1/accounts:update",de(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function mw(n,e){return Jt(n,"POST","/v1/accounts:signInWithPassword",de(n,e))}async function ka(n,e){return fe(n,"POST","/v1/accounts:sendOobCode",de(n,e))}async function gw(n,e){return ka(n,e)}async function _w(n,e){return ka(n,e)}async function yw(n,e){return ka(n,e)}async function Iw(n,e){return ka(n,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Tw(n,e){return Jt(n,"POST","/v1/accounts:signInWithEmailLink",de(n,e))}async function Ew(n,e){return Jt(n,"POST","/v1/accounts:signInWithEmailLink",de(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gr extends mi{constructor(e,t,r,i=null){super("password",r),this._email=e,this._password=t,this._tenantId=i}static _fromEmailAndPassword(e,t){return new Gr(e,t,"password")}static _fromEmailAndCode(e,t,r=null){return new Gr(e,t,"emailLink",r)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;if(t!=null&&t.email&&(t!=null&&t.password)){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return In(e,t,"signInWithPassword",mw,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return Tw(e,{email:this._email,oobCode:this._password});default:st(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":const r={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return In(e,r,"signUpPassword",fw,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return Ew(e,{idToken:t,email:this._email,oobCode:this._password});default:st(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function zt(n,e){return Jt(n,"POST","/v1/accounts:signInWithIdp",de(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vw="http://localhost";class kt extends mi{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new kt(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):st("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:i}=t,s=Ju(t,["providerId","signInMethod"]);if(!r||!i)return null;const o=new kt(r,i);return o.idToken=s.idToken||void 0,o.accessToken=s.accessToken||void 0,o.secret=s.secret,o.nonce=s.nonce,o.pendingToken=s.pendingToken||null,o}_getIdTokenResponse(e){const t=this.buildRequest();return zt(e,t)}_linkToIdToken(e,t){const r=this.buildRequest();return r.idToken=t,zt(e,r)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,zt(e,t)}buildRequest(){const e={requestUri:vw,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=fi(t)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ef(n,e){return fe(n,"POST","/v1/accounts:sendVerificationCode",de(n,e))}async function ww(n,e){return Jt(n,"POST","/v1/accounts:signInWithPhoneNumber",de(n,e))}async function Aw(n,e){const t=await Jt(n,"POST","/v1/accounts:signInWithPhoneNumber",de(n,e));if(t.temporaryProof)throw ns(n,"account-exists-with-different-credential",t);return t}const bw={USER_NOT_FOUND:"user-not-found"};async function Rw(n,e){const t=Object.assign(Object.assign({},e),{operation:"REAUTH"});return Jt(n,"POST","/v1/accounts:signInWithPhoneNumber",de(n,t),bw)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tn extends mi{constructor(e){super("phone","phone"),this.params=e}static _fromVerification(e,t){return new Tn({verificationId:e,verificationCode:t})}static _fromTokenResponse(e,t){return new Tn({phoneNumber:e,temporaryProof:t})}_getIdTokenResponse(e){return ww(e,this._makeVerificationRequest())}_linkToIdToken(e,t){return Aw(e,Object.assign({idToken:t},this._makeVerificationRequest()))}_getReauthenticationResolver(e){return Rw(e,this._makeVerificationRequest())}_makeVerificationRequest(){const{temporaryProof:e,phoneNumber:t,verificationId:r,verificationCode:i}=this.params;return e&&t?{temporaryProof:e,phoneNumber:t}:{sessionInfo:r,code:i}}toJSON(){const e={providerId:this.providerId};return this.params.phoneNumber&&(e.phoneNumber=this.params.phoneNumber),this.params.temporaryProof&&(e.temporaryProof=this.params.temporaryProof),this.params.verificationCode&&(e.verificationCode=this.params.verificationCode),this.params.verificationId&&(e.verificationId=this.params.verificationId),e}static fromJSON(e){typeof e=="string"&&(e=JSON.parse(e));const{verificationId:t,verificationCode:r,phoneNumber:i,temporaryProof:s}=e;return!r&&!t&&!i&&!s?null:new Tn({verificationId:t,verificationCode:r,phoneNumber:i,temporaryProof:s})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Sw(n){switch(n){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function Pw(n){const e=es(ts(n)).link,t=e?es(ts(e)).deep_link_id:null,r=es(ts(n)).deep_link_id;return(r?es(ts(r)).link:null)||r||t||e||n}class gi{constructor(e){var t,r,i,s,o,c;const u=es(ts(e)),l=(t=u.apiKey)!==null&&t!==void 0?t:null,d=(r=u.oobCode)!==null&&r!==void 0?r:null,p=Sw((i=u.mode)!==null&&i!==void 0?i:null);O(l&&d&&p,"argument-error"),this.apiKey=l,this.operation=p,this.code=d,this.continueUrl=(s=u.continueUrl)!==null&&s!==void 0?s:null,this.languageCode=(o=u.lang)!==null&&o!==void 0?o:null,this.tenantId=(c=u.tenantId)!==null&&c!==void 0?c:null}static parseLink(e){const t=Pw(e);try{return new gi(t)}catch{return null}}}function Cw(n){return gi.parseLink(n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dn{constructor(){this.providerId=Dn.PROVIDER_ID}static credential(e,t){return Gr._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const r=gi.parseLink(t);return O(r,"argument-error"),Gr._fromEmailAndCode(e,r.code,r.tenantId)}}Dn.PROVIDER_ID="password";Dn.EMAIL_PASSWORD_SIGN_IN_METHOD="password";Dn.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xt{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _i extends Xt{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}class ls extends _i{static credentialFromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;return O("providerId"in t&&"signInMethod"in t,"argument-error"),kt._fromParams(t)}credential(e){return this._credential(Object.assign(Object.assign({},e),{nonce:e.rawNonce}))}_credential(e){return O(e.idToken||e.accessToken,"argument-error"),kt._fromParams(Object.assign(Object.assign({},e),{providerId:this.providerId,signInMethod:this.providerId}))}static credentialFromResult(e){return ls.oauthCredentialFromTaggedObject(e)}static credentialFromError(e){return ls.oauthCredentialFromTaggedObject(e.customData||{})}static oauthCredentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:r,oauthTokenSecret:i,pendingToken:s,nonce:o,providerId:c}=e;if(!r&&!i&&!t&&!s||!c)return null;try{return new ls(c)._credential({idToken:t,accessToken:r,nonce:o,pendingToken:s})}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lt extends _i{constructor(){super("facebook.com")}static credential(e){return kt._fromParams({providerId:Lt.PROVIDER_ID,signInMethod:Lt.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Lt.credentialFromTaggedObject(e)}static credentialFromError(e){return Lt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Lt.credential(e.oauthAccessToken)}catch{return null}}}Lt.FACEBOOK_SIGN_IN_METHOD="facebook.com";Lt.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mt extends _i{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return kt._fromParams({providerId:Mt.PROVIDER_ID,signInMethod:Mt.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return Mt.credentialFromTaggedObject(e)}static credentialFromError(e){return Mt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:r}=e;if(!t&&!r)return null;try{return Mt.credential(t,r)}catch{return null}}}Mt.GOOGLE_SIGN_IN_METHOD="google.com";Mt.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ft extends _i{constructor(){super("github.com")}static credential(e){return kt._fromParams({providerId:Ft.PROVIDER_ID,signInMethod:Ft.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Ft.credentialFromTaggedObject(e)}static credentialFromError(e){return Ft.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Ft.credential(e.oauthAccessToken)}catch{return null}}}Ft.GITHUB_SIGN_IN_METHOD="github.com";Ft.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kw="http://localhost";class Rs extends mi{constructor(e,t){super(e,e),this.pendingToken=t}_getIdTokenResponse(e){const t=this.buildRequest();return zt(e,t)}_linkToIdToken(e,t){const r=this.buildRequest();return r.idToken=t,zt(e,r)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,zt(e,t)}toJSON(){return{signInMethod:this.signInMethod,providerId:this.providerId,pendingToken:this.pendingToken}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:i,pendingToken:s}=t;return!r||!i||!s||r!==i?null:new Rs(r,s)}static _create(e,t){return new Rs(e,t)}buildRequest(){return{requestUri:kw,returnSecureToken:!0,pendingToken:this.pendingToken}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Dw="saml.";class na extends Xt{constructor(e){O(e.startsWith(Dw),"argument-error"),super(e)}static credentialFromResult(e){return na.samlCredentialFromTaggedObject(e)}static credentialFromError(e){return na.samlCredentialFromTaggedObject(e.customData||{})}static credentialFromJSON(e){const t=Rs.fromJSON(e);return O(t,"argument-error"),t}static samlCredentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{pendingToken:t,providerId:r}=e;if(!t||!r)return null;try{return Rs._create(r,t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ut extends _i{constructor(){super("twitter.com")}static credential(e,t){return kt._fromParams({providerId:Ut.PROVIDER_ID,signInMethod:Ut.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return Ut.credentialFromTaggedObject(e)}static credentialFromError(e){return Ut.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:r}=e;if(!t||!r)return null;try{return Ut.credential(t,r)}catch{return null}}}Ut.TWITTER_SIGN_IN_METHOD="twitter.com";Ut.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function zm(n,e){return Jt(n,"POST","/v1/accounts:signUp",de(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pt{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,r,i=!1){const s=await yt._fromIdTokenResponse(e,r,i),o=tf(r);return new pt({user:s,providerId:o,_tokenResponse:r,operationType:t})}static async _forOperation(e,t,r){await e._updateTokensIfNecessary(r,!0);const i=tf(r);return new pt({user:e,providerId:i,_tokenResponse:r,operationType:t})}}function tf(n){return n.providerId?n.providerId:"phoneNumber"in n?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Nw(n){var e;if(me(n.app))return Promise.reject(Ve(n));const t=Ee(n);if(await t._initializationPromise,!((e=t.currentUser)===null||e===void 0)&&e.isAnonymous)return new pt({user:t.currentUser,providerId:null,operationType:"signIn"});const r=await zm(t,{returnSecureToken:!0}),i=await pt._fromIdTokenResponse(t,"signIn",r,!0);return await t._updateCurrentUser(i.user),i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ra extends mt{constructor(e,t,r,i){var s;super(t.code,t.message),this.operationType=r,this.user=i,Object.setPrototypeOf(this,ra.prototype),this.customData={appName:e.name,tenantId:(s=e.tenantId)!==null&&s!==void 0?s:void 0,_serverResponse:t.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,t,r,i){return new ra(e,t,r,i)}}function Gm(n,e,t,r){return(e==="reauthenticate"?t._getReauthenticationResolver(n):t._getIdTokenResponse(n)).catch(s=>{throw s.code==="auth/multi-factor-auth-required"?ra._fromErrorAndOperation(n,s,e,r):s})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Km(n){return new Set(n.map(({providerId:e})=>e).filter(e=>!!e))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Vw(n,e){const t=j(n);await Da(!0,t,e);const{providerUserInfo:r}=await Mv(t.auth,{idToken:await t.getIdToken(),deleteProvider:[e]}),i=Km(r||[]);return t.providerData=t.providerData.filter(s=>i.has(s.providerId)),i.has("phone")||(t.phoneNumber=null),await t.auth._persistUserIfCurrent(t),t}async function il(n,e,t=!1){const r=await Wt(n,e._linkToIdToken(n.auth,await n.getIdToken()),t);return pt._forOperation(n,"link",r)}async function Da(n,e,t){await bs(e);const r=Km(e.providerData),i=n===!1?"provider-already-linked":"no-such-provider";O(r.has(t)===n,e.auth,i)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Wm(n,e,t=!1){const{auth:r}=n;if(me(r.app))return Promise.reject(Ve(r));const i="reauthenticate";try{const s=await Wt(n,Gm(r,i,e,n),t);O(s.idToken,r,"internal-error");const o=Ca(s.idToken);O(o,r,"internal-error");const{sub:c}=o;return O(n.uid===c,r,"user-mismatch"),pt._forOperation(n,i,s)}catch(s){throw(s==null?void 0:s.code)==="auth/user-not-found"&&st(r,"user-mismatch"),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Hm(n,e,t=!1){if(me(n.app))return Promise.reject(Ve(n));const r="signIn",i=await Gm(n,r,e),s=await pt._fromIdTokenResponse(n,r,i);return t||await n._updateCurrentUser(s.user),s}async function Na(n,e){return Hm(Ee(n),e)}async function Qm(n,e){const t=j(n);return await Da(!1,t,e.providerId),il(t,e)}async function Ym(n,e){return Wm(j(n),e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ow(n,e){return Jt(n,"POST","/v1/accounts:signInWithCustomToken",de(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function xw(n,e){if(me(n.app))return Promise.reject(Ve(n));const t=Ee(n),r=await Ow(t,{token:e,returnSecureToken:!0}),i=await pt._fromIdTokenResponse(t,"signIn",r);return await t._updateCurrentUser(i.user),i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $s{constructor(e,t){this.factorId=e,this.uid=t.mfaEnrollmentId,this.enrollmentTime=new Date(t.enrolledAt).toUTCString(),this.displayName=t.displayName}static _fromServerResponse(e,t){return"phoneInfo"in t?sl._fromServerResponse(e,t):"totpInfo"in t?ol._fromServerResponse(e,t):st(e,"internal-error")}}class sl extends $s{constructor(e){super("phone",e),this.phoneNumber=e.phoneInfo}static _fromServerResponse(e,t){return new sl(t)}}class ol extends $s{constructor(e){super("totp",e)}static _fromServerResponse(e,t){return new ol(t)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Va(n,e,t){var r;O(((r=t.url)===null||r===void 0?void 0:r.length)>0,n,"invalid-continue-uri"),O(typeof t.dynamicLinkDomain>"u"||t.dynamicLinkDomain.length>0,n,"invalid-dynamic-link-domain"),O(typeof t.linkDomain>"u"||t.linkDomain.length>0,n,"invalid-hosting-link-domain"),e.continueUrl=t.url,e.dynamicLinkDomain=t.dynamicLinkDomain,e.linkDomain=t.linkDomain,e.canHandleCodeInApp=t.handleCodeInApp,t.iOS&&(O(t.iOS.bundleId.length>0,n,"missing-ios-bundle-id"),e.iOSBundleId=t.iOS.bundleId),t.android&&(O(t.android.packageName.length>0,n,"missing-android-pkg-name"),e.androidInstallApp=t.android.installApp,e.androidMinimumVersionCode=t.android.minimumVersion,e.androidPackageName=t.android.packageName)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function al(n){const e=Ee(n);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function Lw(n,e,t){const r=Ee(n),i={requestType:"PASSWORD_RESET",email:e,clientType:"CLIENT_TYPE_WEB"};t&&Va(r,i,t),await In(r,i,"getOobCode",_w,"EMAIL_PASSWORD_PROVIDER")}async function Mw(n,e,t){await $m(j(n),{oobCode:e,newPassword:t}).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&al(n),r})}async function Fw(n,e){await pw(j(n),{oobCode:e})}async function Jm(n,e){const t=j(n),r=await $m(t,{oobCode:e}),i=r.requestType;switch(O(i,t,"internal-error"),i){case"EMAIL_SIGNIN":break;case"VERIFY_AND_CHANGE_EMAIL":O(r.newEmail,t,"internal-error");break;case"REVERT_SECOND_FACTOR_ADDITION":O(r.mfaInfo,t,"internal-error");default:O(r.email,t,"internal-error")}let s=null;return r.mfaInfo&&(s=$s._fromServerResponse(Ee(t),r.mfaInfo)),{data:{email:(r.requestType==="VERIFY_AND_CHANGE_EMAIL"?r.newEmail:r.email)||null,previousEmail:(r.requestType==="VERIFY_AND_CHANGE_EMAIL"?r.email:r.newEmail)||null,multiFactorInfo:s},operation:i}}async function Uw(n,e){const{data:t}=await Jm(j(n),e);return t.email}async function Bw(n,e,t){if(me(n.app))return Promise.reject(Ve(n));const r=Ee(n),o=await In(r,{returnSecureToken:!0,email:e,password:t,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",zm,"EMAIL_PASSWORD_PROVIDER").catch(u=>{throw u.code==="auth/password-does-not-meet-requirements"&&al(n),u}),c=await pt._fromIdTokenResponse(r,"signIn",o);return await r._updateCurrentUser(c.user),c}function qw(n,e,t){return me(n.app)?Promise.reject(Ve(n)):Na(j(n),Dn.credential(e,t)).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&al(n),r})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function jw(n,e,t){const r=Ee(n),i={requestType:"EMAIL_SIGNIN",email:e,clientType:"CLIENT_TYPE_WEB"};function s(o,c){O(c.handleCodeInApp,r,"argument-error"),c&&Va(r,o,c)}s(i,t),await In(r,i,"getOobCode",yw,"EMAIL_PASSWORD_PROVIDER")}function $w(n,e){const t=gi.parseLink(e);return(t==null?void 0:t.operation)==="EMAIL_SIGNIN"}async function zw(n,e,t){if(me(n.app))return Promise.reject(Ve(n));const r=j(n),i=Dn.credentialWithLink(e,t||As());return O(i._tenantId===(r.tenantId||null),r,"tenant-id-mismatch"),Na(r,i)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Gw(n,e){return fe(n,"POST","/v1/accounts:createAuthUri",de(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Kw(n,e){const t=el()?As():"http://localhost",r={identifier:e,continueUri:t},{signinMethods:i}=await Gw(j(n),r);return i||[]}async function Ww(n,e){const t=j(n),i={requestType:"VERIFY_EMAIL",idToken:await n.getIdToken()};e&&Va(t.auth,i,e);const{email:s}=await gw(t.auth,i);s!==n.email&&await n.reload()}async function Hw(n,e,t){const r=j(n),s={requestType:"VERIFY_AND_CHANGE_EMAIL",idToken:await n.getIdToken(),newEmail:e};t&&Va(r.auth,s,t);const{email:o}=await Iw(r.auth,s);o!==n.email&&await n.reload()}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Qw(n,e){return fe(n,"POST","/v1/accounts:update",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Yw(n,{displayName:e,photoURL:t}){if(e===void 0&&t===void 0)return;const r=j(n),s={idToken:await r.getIdToken(),displayName:e,photoUrl:t,returnSecureToken:!0},o=await Wt(r,Qw(r.auth,s));r.displayName=o.displayName||null,r.photoURL=o.photoUrl||null;const c=r.providerData.find(({providerId:u})=>u==="password");c&&(c.displayName=r.displayName,c.photoURL=r.photoURL),await r._updateTokensIfNecessary(o)}function Jw(n,e){const t=j(n);return me(t.auth.app)?Promise.reject(Ve(t.auth)):Xm(t,e,null)}function Xw(n,e){return Xm(j(n),null,e)}async function Xm(n,e,t){const{auth:r}=n,s={idToken:await n.getIdToken(),returnSecureToken:!0};e&&(s.email=e),t&&(s.password=t);const o=await Wt(n,dw(r,s));await n._updateTokensIfNecessary(o,!0)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Zw(n){var e,t;if(!n)return null;const{providerId:r}=n,i=n.rawUserInfo?JSON.parse(n.rawUserInfo):{},s=n.isNewUser||n.kind==="identitytoolkit#SignupNewUserResponse";if(!r&&(n!=null&&n.idToken)){const o=(t=(e=Ca(n.idToken))===null||e===void 0?void 0:e.firebase)===null||t===void 0?void 0:t.sign_in_provider;if(o){const c=o!=="anonymous"&&o!=="custom"?o:null;return new jr(s,c)}}if(!r)return null;switch(r){case"facebook.com":return new eA(s,i);case"github.com":return new tA(s,i);case"google.com":return new nA(s,i);case"twitter.com":return new rA(s,i,n.screenName||null);case"custom":case"anonymous":return new jr(s,null);default:return new jr(s,r,i)}}class jr{constructor(e,t,r={}){this.isNewUser=e,this.providerId=t,this.profile=r}}class Zm extends jr{constructor(e,t,r,i){super(e,t,r),this.username=i}}class eA extends jr{constructor(e,t){super(e,"facebook.com",t)}}class tA extends Zm{constructor(e,t){super(e,"github.com",t,typeof(t==null?void 0:t.login)=="string"?t==null?void 0:t.login:null)}}class nA extends jr{constructor(e,t){super(e,"google.com",t)}}class rA extends Zm{constructor(e,t,r){super(e,"twitter.com",t,r)}}function iA(n){const{user:e,_tokenResponse:t}=n;return e.isAnonymous&&!t?{providerId:null,isNewUser:!1,profile:null}:Zw(t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sA(n,e){return j(n).setPersistence(e)}function oA(n){return Um(n)}async function aA(n,e){return Ee(n).validatePassword(e)}function eg(n,e,t,r){return j(n).onIdTokenChanged(e,t,r)}function tg(n,e,t){return j(n).beforeAuthStateChanged(e,t)}function cA(n,e,t,r){return j(n).onAuthStateChanged(e,t,r)}function uA(n){j(n).useDeviceLanguage()}function lA(n,e){return j(n).updateCurrentUser(e)}function hA(n){return j(n).signOut()}function dA(n,e){return Ee(n).revokeAccessToken(e)}async function fA(n){return j(n).delete()}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xn{constructor(e,t,r){this.type=e,this.credential=t,this.user=r}static _fromIdtoken(e,t){return new Xn("enroll",e,t)}static _fromMfaPendingCredential(e){return new Xn("signin",e)}toJSON(){return{multiFactorSession:{[this.type==="enroll"?"idToken":"pendingCredential"]:this.credential}}}static fromJSON(e){var t,r;if(e!=null&&e.multiFactorSession){if(!((t=e.multiFactorSession)===null||t===void 0)&&t.pendingCredential)return Xn._fromMfaPendingCredential(e.multiFactorSession.pendingCredential);if(!((r=e.multiFactorSession)===null||r===void 0)&&r.idToken)return Xn._fromIdtoken(e.multiFactorSession.idToken)}return null}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cl{constructor(e,t,r){this.session=e,this.hints=t,this.signInResolver=r}static _fromError(e,t){const r=Ee(e),i=t.customData._serverResponse,s=(i.mfaInfo||[]).map(c=>$s._fromServerResponse(r,c));O(i.mfaPendingCredential,r,"internal-error");const o=Xn._fromMfaPendingCredential(i.mfaPendingCredential);return new cl(o,s,async c=>{const u=await c._process(r,o);delete i.mfaInfo,delete i.mfaPendingCredential;const l=Object.assign(Object.assign({},i),{idToken:u.idToken,refreshToken:u.refreshToken});switch(t.operationType){case"signIn":const d=await pt._fromIdTokenResponse(r,t.operationType,l);return await r._updateCurrentUser(d.user),d;case"reauthenticate":return O(t.user,r,"internal-error"),pt._forOperation(t.user,t.operationType,l);default:st(r,"internal-error")}})}async resolveSignIn(e){const t=e;return this.signInResolver(t)}}function pA(n,e){var t;const r=j(n),i=e;return O(e.customData.operationType,r,"argument-error"),O((t=i.customData._serverResponse)===null||t===void 0?void 0:t.mfaPendingCredential,r,"argument-error"),cl._fromError(r,i)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nf(n,e){return fe(n,"POST","/v2/accounts/mfaEnrollment:start",de(n,e))}function mA(n,e){return fe(n,"POST","/v2/accounts/mfaEnrollment:finalize",de(n,e))}function gA(n,e){return fe(n,"POST","/v2/accounts/mfaEnrollment:start",de(n,e))}function _A(n,e){return fe(n,"POST","/v2/accounts/mfaEnrollment:finalize",de(n,e))}function yA(n,e){return fe(n,"POST","/v2/accounts/mfaEnrollment:withdraw",de(n,e))}class ul{constructor(e){this.user=e,this.enrolledFactors=[],e._onReload(t=>{t.mfaInfo&&(this.enrolledFactors=t.mfaInfo.map(r=>$s._fromServerResponse(e.auth,r)))})}static _fromUser(e){return new ul(e)}async getSession(){return Xn._fromIdtoken(await this.user.getIdToken(),this.user)}async enroll(e,t){const r=e,i=await this.getSession(),s=await Wt(this.user,r._process(this.user.auth,i,t));return await this.user._updateTokensIfNecessary(s),this.user.reload()}async unenroll(e){const t=typeof e=="string"?e:e.uid,r=await this.user.getIdToken();try{const i=await Wt(this.user,yA(this.user.auth,{idToken:r,mfaEnrollmentId:t}));this.enrolledFactors=this.enrolledFactors.filter(({uid:s})=>s!==t),await this.user._updateTokensIfNecessary(i),await this.user.reload()}catch(i){throw i}}}const zc=new WeakMap;function IA(n){const e=j(n);return zc.has(e)||zc.set(e,ul._fromUser(e)),zc.get(e)}const ia="__sak";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ng{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(ia,"1"),this.storage.removeItem(ia),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const TA=1e3,EA=10;class rg extends ng{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=xm(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const r=this.storage.getItem(t),i=this.localCache[t];r!==i&&e(t,i,r)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,c,u)=>{this.notifyListeners(o,u)});return}const r=e.key;t?this.detachListener():this.stopPolling();const i=()=>{const o=this.storage.getItem(r);!t&&this.localCache[r]===o||this.notifyListeners(r,o)},s=this.storage.getItem(r);Gv()&&s!==e.newValue&&e.newValue!==e.oldValue?setTimeout(i,EA):i()}notifyListeners(e,t){this.localCache[e]=t;const r=this.listeners[e];if(r)for(const i of Array.from(r))i(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:r}),!0)})},TA)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}rg.type="LOCAL";const ig=rg;/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vA=1e3;function Gc(n){var e,t;const r=n.replace(/[\\^$.*+?()[\]{}|]/g,"\\$&"),i=RegExp(`${r}=([^;]+)`);return(t=(e=document.cookie.match(i))===null||e===void 0?void 0:e[1])!==null&&t!==void 0?t:null}function Kc(n){return`${window.location.protocol==="http:"?"__dev_":"__HOST-"}FIREBASE_${n.split(":")[3]}`}class sg{constructor(){this.type="COOKIE",this.listenerUnsubscribes=new Map}_getFinalTarget(e){if(typeof window===void 0)return e;const t=new URL(`${window.location.origin}/__cookies__`);return t.searchParams.set("finalTarget",e),t}async _isAvailable(){var e;return typeof isSecureContext=="boolean"&&!isSecureContext||typeof navigator>"u"||typeof document>"u"?!1:(e=navigator.cookieEnabled)!==null&&e!==void 0?e:!0}async _set(e,t){}async _get(e){if(!this._isAvailable())return null;const t=Kc(e);if(window.cookieStore){const r=await window.cookieStore.get(t);return r==null?void 0:r.value}return Gc(t)}async _remove(e){if(!this._isAvailable()||!await this._get(e))return;const r=Kc(e);document.cookie=`${r}=;Max-Age=34560000;Partitioned;Secure;SameSite=Strict;Path=/;Priority=High`,await fetch("/__cookies__",{method:"DELETE"}).catch(()=>{})}_addListener(e,t){if(!this._isAvailable())return;const r=Kc(e);if(window.cookieStore){const c=(l=>{const d=l.changed.find(m=>m.name===r);d&&t(d.value),l.deleted.find(m=>m.name===r)&&t(null)}),u=()=>window.cookieStore.removeEventListener("change",c);return this.listenerUnsubscribes.set(t,u),window.cookieStore.addEventListener("change",c)}let i=Gc(r);const s=setInterval(()=>{const c=Gc(r);c!==i&&(t(c),i=c)},vA),o=()=>clearInterval(s);this.listenerUnsubscribes.set(t,o)}_removeListener(e,t){const r=this.listenerUnsubscribes.get(t);r&&(r(),this.listenerUnsubscribes.delete(t))}}sg.type="COOKIE";const wA=sg;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class og extends ng{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}og.type="SESSION";const ll=og;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function AA(n){return Promise.all(n.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oa{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(i=>i.isListeningto(e));if(t)return t;const r=new Oa(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:r,eventType:i,data:s}=t.data,o=this.handlersMap[i];if(!(o!=null&&o.size))return;t.ports[0].postMessage({status:"ack",eventId:r,eventType:i});const c=Array.from(o).map(async l=>l(t.origin,s)),u=await AA(c);t.ports[0].postMessage({status:"done",eventId:r,eventType:i,response:u})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Oa.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xa(n="",e=10){let t="";for(let r=0;r<e;r++)t+=Math.floor(Math.random()*10);return n+t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bA{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,r=50){const i=typeof MessageChannel<"u"?new MessageChannel:null;if(!i)throw new Error("connection_unavailable");let s,o;return new Promise((c,u)=>{const l=xa("",20);i.port1.start();const d=setTimeout(()=>{u(new Error("unsupported_event"))},r);o={messageChannel:i,onMessage(p){const m=p;if(m.data.eventId===l)switch(m.data.status){case"ack":clearTimeout(d),s=setTimeout(()=>{u(new Error("timeout"))},3e3);break;case"done":clearTimeout(s),c(m.data.response);break;default:clearTimeout(d),clearTimeout(s),u(new Error("invalid_response"));break}}},this.handlers.add(o),i.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:l,data:t},[i.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Re(){return window}function RA(n){Re().location.href=n}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hl(){return typeof Re().WorkerGlobalScope<"u"&&typeof Re().importScripts=="function"}async function SA(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function PA(){var n;return((n=navigator==null?void 0:navigator.serviceWorker)===null||n===void 0?void 0:n.controller)||null}function CA(){return hl()?self:null}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ag="firebaseLocalStorageDb",kA=1,sa="firebaseLocalStorage",cg="fbase_key";class zs{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function La(n,e){return n.transaction([sa],e?"readwrite":"readonly").objectStore(sa)}function DA(){const n=indexedDB.deleteDatabase(ag);return new zs(n).toPromise()}function mu(){const n=indexedDB.open(ag,kA);return new Promise((e,t)=>{n.addEventListener("error",()=>{t(n.error)}),n.addEventListener("upgradeneeded",()=>{const r=n.result;try{r.createObjectStore(sa,{keyPath:cg})}catch(i){t(i)}}),n.addEventListener("success",async()=>{const r=n.result;r.objectStoreNames.contains(sa)?e(r):(r.close(),await DA(),e(await mu()))})})}async function rf(n,e,t){const r=La(n,!0).put({[cg]:e,value:t});return new zs(r).toPromise()}async function NA(n,e){const t=La(n,!1).get(e),r=await new zs(t).toPromise();return r===void 0?null:r.value}function sf(n,e){const t=La(n,!0).delete(e);return new zs(t).toPromise()}const VA=800,OA=3;class ug{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await mu(),this.db)}async _withRetries(e){let t=0;for(;;)try{const r=await this._openDb();return await e(r)}catch(r){if(t++>OA)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return hl()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Oa._getInstance(CA()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var e,t;if(this.activeServiceWorker=await SA(),!this.activeServiceWorker)return;this.sender=new bA(this.activeServiceWorker);const r=await this.sender._send("ping",{},800);r&&!((e=r[0])===null||e===void 0)&&e.fulfilled&&!((t=r[0])===null||t===void 0)&&t.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||PA()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await mu();return await rf(e,ia,"1"),await sf(e,ia),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(r=>rf(r,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(r=>NA(r,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>sf(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(i=>{const s=La(i,!1).getAll();return new zs(s).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],r=new Set;if(e.length!==0)for(const{fbase_key:i,value:s}of e)r.add(i),JSON.stringify(this.localCache[i])!==JSON.stringify(s)&&(this.notifyListeners(i,s),t.push(i));for(const i of Object.keys(this.localCache))this.localCache[i]&&!r.has(i)&&(this.notifyListeners(i,null),t.push(i));return t}notifyListeners(e,t){this.localCache[e]=t;const r=this.listeners[e];if(r)for(const i of Array.from(r))i(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),VA)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}ug.type="LOCAL";const lg=ug;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function of(n,e){return fe(n,"POST","/v2/accounts/mfaSignIn:start",de(n,e))}function xA(n,e){return fe(n,"POST","/v2/accounts/mfaSignIn:finalize",de(n,e))}function LA(n,e){return fe(n,"POST","/v2/accounts/mfaSignIn:finalize",de(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Wc=Mm("rcb"),MA=new qs(3e4,6e4);class FA{constructor(){var e;this.hostLanguage="",this.counter=0,this.librarySeparatelyLoaded=!!(!((e=Re().grecaptcha)===null||e===void 0)&&e.render)}load(e,t=""){return O(UA(t),e,"argument-error"),this.shouldResolveImmediately(t)&&Wd(Re().grecaptcha)?Promise.resolve(Re().grecaptcha):new Promise((r,i)=>{const s=Re().setTimeout(()=>{i(Ye(e,"network-request-failed"))},MA.get());Re()[Wc]=()=>{Re().clearTimeout(s),delete Re()[Wc];const c=Re().grecaptcha;if(!c||!Wd(c)){i(Ye(e,"internal-error"));return}const u=c.render;c.render=(l,d)=>{const p=u(l,d);return this.counter++,p},this.hostLanguage=t,r(c)};const o=`${Xv()}?${fi({onload:Wc,render:"explicit",hl:t})}`;rl(o).catch(()=>{clearTimeout(s),i(Ye(e,"internal-error"))})})}clearedOneInstance(){this.counter--}shouldResolveImmediately(e){var t;return!!(!((t=Re().grecaptcha)===null||t===void 0)&&t.render)&&(e===this.hostLanguage||this.counter>0||this.librarySeparatelyLoaded)}}function UA(n){return n.length<=6&&/^\s*[a-zA-Z0-9\-]*\s*$/.test(n)}class BA{async load(e){return new rw(e)}clearedOneInstance(){}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hs="recaptcha",qA={theme:"light",type:"image"};class jA{constructor(e,t,r=Object.assign({},qA)){this.parameters=r,this.type=hs,this.destroyed=!1,this.widgetId=null,this.tokenChangeListeners=new Set,this.renderPromise=null,this.recaptcha=null,this.auth=Ee(e),this.isInvisible=this.parameters.size==="invisible",O(typeof document<"u",this.auth,"operation-not-supported-in-this-environment");const i=typeof t=="string"?document.getElementById(t):t;O(i,this.auth,"argument-error"),this.container=i,this.parameters.callback=this.makeTokenCallback(this.parameters.callback),this._recaptchaLoader=this.auth.settings.appVerificationDisabledForTesting?new BA:new FA,this.validateStartingState()}async verify(){this.assertNotDestroyed();const e=await this.render(),t=this.getAssertedRecaptcha(),r=t.getResponse(e);return r||new Promise(i=>{const s=o=>{o&&(this.tokenChangeListeners.delete(s),i(o))};this.tokenChangeListeners.add(s),this.isInvisible&&t.execute(e)})}render(){try{this.assertNotDestroyed()}catch(e){return Promise.reject(e)}return this.renderPromise?this.renderPromise:(this.renderPromise=this.makeRenderPromise().catch(e=>{throw this.renderPromise=null,e}),this.renderPromise)}_reset(){this.assertNotDestroyed(),this.widgetId!==null&&this.getAssertedRecaptcha().reset(this.widgetId)}clear(){this.assertNotDestroyed(),this.destroyed=!0,this._recaptchaLoader.clearedOneInstance(),this.isInvisible||this.container.childNodes.forEach(e=>{this.container.removeChild(e)})}validateStartingState(){O(!this.parameters.sitekey,this.auth,"argument-error"),O(this.isInvisible||!this.container.hasChildNodes(),this.auth,"argument-error"),O(typeof document<"u",this.auth,"operation-not-supported-in-this-environment")}makeTokenCallback(e){return t=>{if(this.tokenChangeListeners.forEach(r=>r(t)),typeof e=="function")e(t);else if(typeof e=="string"){const r=Re()[e];typeof r=="function"&&r(t)}}}assertNotDestroyed(){O(!this.destroyed,this.auth,"internal-error")}async makeRenderPromise(){if(await this.init(),!this.widgetId){let e=this.container;if(!this.isInvisible){const t=document.createElement("div");e.appendChild(t),e=t}this.widgetId=this.getAssertedRecaptcha().render(e,this.parameters)}return this.widgetId}async init(){O(el()&&!hl(),this.auth,"internal-error"),await $A(),this.recaptcha=await this._recaptchaLoader.load(this.auth,this.auth.languageCode||void 0);const e=await xv(this.auth);O(e,this.auth,"internal-error"),this.parameters.sitekey=e}getAssertedRecaptcha(){return O(this.recaptcha,this.auth,"internal-error"),this.recaptcha}}function $A(){let n=null;return new Promise(e=>{if(document.readyState==="complete"){e();return}n=()=>e(),window.addEventListener("load",n)}).catch(e=>{throw n&&window.removeEventListener("load",n),e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dl{constructor(e,t){this.verificationId=e,this.onConfirmation=t}confirm(e){const t=Tn._fromVerification(this.verificationId,e);return this.onConfirmation(t)}}async function zA(n,e,t){if(me(n.app))return Promise.reject(Ve(n));const r=Ee(n),i=await Ma(r,e,j(t));return new dl(i,s=>Na(r,s))}async function GA(n,e,t){const r=j(n);await Da(!1,r,"phone");const i=await Ma(r.auth,e,j(t));return new dl(i,s=>Qm(r,s))}async function KA(n,e,t){const r=j(n);if(me(r.auth.app))return Promise.reject(Ve(r.auth));const i=await Ma(r.auth,e,j(t));return new dl(i,s=>Ym(r,s))}async function Ma(n,e,t){var r;if(!n._getRecaptchaConfig())try{await Um(n)}catch{console.log("Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.")}try{let i;if(typeof e=="string"?i={phoneNumber:e}:i=e,"session"in i){const s=i.session;if("phoneNumber"in i){O(s.type==="enroll",n,"internal-error");const o={idToken:s.credential,phoneEnrollmentInfo:{phoneNumber:i.phoneNumber,clientType:"CLIENT_TYPE_WEB"}};return(await In(n,o,"mfaSmsEnrollment",async(d,p)=>{if(p.phoneEnrollmentInfo.captchaResponse===us){O((t==null?void 0:t.type)===hs,d,"argument-error");const m=await Hc(d,p,t);return nf(d,m)}return nf(d,p)},"PHONE_PROVIDER").catch(d=>Promise.reject(d))).phoneSessionInfo.sessionInfo}else{O(s.type==="signin",n,"internal-error");const o=((r=i.multiFactorHint)===null||r===void 0?void 0:r.uid)||i.multiFactorUid;O(o,n,"missing-multi-factor-info");const c={mfaPendingCredential:s.credential,mfaEnrollmentId:o,phoneSignInInfo:{clientType:"CLIENT_TYPE_WEB"}};return(await In(n,c,"mfaSmsSignIn",async(p,m)=>{if(m.phoneSignInInfo.captchaResponse===us){O((t==null?void 0:t.type)===hs,p,"argument-error");const T=await Hc(p,m,t);return of(p,T)}return of(p,m)},"PHONE_PROVIDER").catch(p=>Promise.reject(p))).phoneResponseInfo.sessionInfo}}else{const s={phoneNumber:i.phoneNumber,clientType:"CLIENT_TYPE_WEB"};return(await In(n,s,"sendVerificationCode",async(l,d)=>{if(d.captchaResponse===us){O((t==null?void 0:t.type)===hs,l,"argument-error");const p=await Hc(l,d,t);return ef(l,p)}return ef(l,d)},"PHONE_PROVIDER").catch(l=>Promise.reject(l))).sessionInfo}}finally{t==null||t._reset()}}async function WA(n,e){const t=j(n);if(me(t.auth.app))return Promise.reject(Ve(t.auth));await il(t,e)}async function Hc(n,e,t){O(t.type===hs,n,"argument-error");const r=await t.verify();O(typeof r=="string",n,"argument-error");const i=Object.assign({},e);if("phoneEnrollmentInfo"in i){const s=i.phoneEnrollmentInfo.phoneNumber,o=i.phoneEnrollmentInfo.captchaResponse,c=i.phoneEnrollmentInfo.clientType,u=i.phoneEnrollmentInfo.recaptchaVersion;return Object.assign(i,{phoneEnrollmentInfo:{phoneNumber:s,recaptchaToken:r,captchaResponse:o,clientType:c,recaptchaVersion:u}}),i}else if("phoneSignInInfo"in i){const s=i.phoneSignInInfo.captchaResponse,o=i.phoneSignInInfo.clientType,c=i.phoneSignInInfo.recaptchaVersion;return Object.assign(i,{phoneSignInInfo:{recaptchaToken:r,captchaResponse:s,clientType:o,recaptchaVersion:c}}),i}else return Object.assign(i,{recaptchaToken:r}),i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tr{constructor(e){this.providerId=tr.PROVIDER_ID,this.auth=Ee(e)}verifyPhoneNumber(e,t){return Ma(this.auth,e,j(t))}static credential(e,t){return Tn._fromVerification(e,t)}static credentialFromResult(e){const t=e;return tr.credentialFromTaggedObject(t)}static credentialFromError(e){return tr.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{phoneNumber:t,temporaryProof:r}=e;return t&&r?Tn._fromTokenResponse(t,r):null}}tr.PROVIDER_ID="phone";tr.PHONE_SIGN_IN_METHOD="phone";/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Tr(n,e){return e?Bt(e):(O(n._popupRedirectResolver,n,"argument-error"),n._popupRedirectResolver)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fl extends mi{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return zt(e,this._buildIdpRequest())}_linkToIdToken(e,t){return zt(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return zt(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function HA(n){return Hm(n.auth,new fl(n),n.bypassAuthState)}function QA(n){const{auth:e,user:t}=n;return O(t,e,"internal-error"),Wm(t,new fl(n),n.bypassAuthState)}async function YA(n){const{auth:e,user:t}=n;return O(t,e,"internal-error"),il(t,new fl(n),n.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hg{constructor(e,t,r,i,s=!1){this.auth=e,this.resolver=r,this.user=i,this.bypassAuthState=s,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:r,postBody:i,tenantId:s,error:o,type:c}=e;if(o){this.reject(o);return}const u={auth:this.auth,requestUri:t,sessionId:r,tenantId:s||void 0,postBody:i||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(c)(u))}catch(l){this.reject(l)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return HA;case"linkViaPopup":case"linkViaRedirect":return YA;case"reauthViaPopup":case"reauthViaRedirect":return QA;default:st(this.auth,"internal-error")}}resolve(e){Kt(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){Kt(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const JA=new qs(2e3,1e4);async function XA(n,e,t){if(me(n.app))return Promise.reject(Ye(n,"operation-not-supported-in-this-environment"));const r=Ee(n);pi(n,e,Xt);const i=Tr(r,t);return new qt(r,"signInViaPopup",e,i).executeNotNull()}async function ZA(n,e,t){const r=j(n);if(me(r.auth.app))return Promise.reject(Ye(r.auth,"operation-not-supported-in-this-environment"));pi(r.auth,e,Xt);const i=Tr(r.auth,t);return new qt(r.auth,"reauthViaPopup",e,i,r).executeNotNull()}async function eb(n,e,t){const r=j(n);pi(r.auth,e,Xt);const i=Tr(r.auth,t);return new qt(r.auth,"linkViaPopup",e,i,r).executeNotNull()}class qt extends hg{constructor(e,t,r,i,s){super(e,t,i,s),this.provider=r,this.authWindow=null,this.pollId=null,qt.currentPopupAction&&qt.currentPopupAction.cancel(),qt.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return O(e,this.auth,"internal-error"),e}async onExecution(){Kt(this.filter.length===1,"Popup operations only handle one event");const e=xa();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(Ye(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)===null||e===void 0?void 0:e.associatedEvent)||null}cancel(){this.reject(Ye(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,qt.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,r;if(!((r=(t=this.authWindow)===null||t===void 0?void 0:t.window)===null||r===void 0)&&r.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(Ye(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,JA.get())};e()}}qt.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tb="pendingRedirect",Uo=new Map;class nb extends hg{constructor(e,t,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,r),this.eventId=null}async execute(){let e=Uo.get(this.auth._key());if(!e){try{const r=await rb(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(t){e=()=>Promise.reject(t)}Uo.set(this.auth._key(),e)}return this.bypassAuthState||Uo.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function rb(n,e){const t=fg(e),r=dg(n);if(!await r._isAvailable())return!1;const i=await r._get(t)==="true";return await r._remove(t),i}async function pl(n,e){return dg(n)._set(fg(e),"true")}function ib(n,e){Uo.set(n._key(),e)}function dg(n){return Bt(n._redirectPersistence)}function fg(n){return Fo(tb,n.config.apiKey,n.name)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sb(n,e,t){return ob(n,e,t)}async function ob(n,e,t){if(me(n.app))return Promise.reject(Ve(n));const r=Ee(n);pi(n,e,Xt),await r._initializationPromise;const i=Tr(r,t);return await pl(i,r),i._openRedirect(r,e,"signInViaRedirect")}function ab(n,e,t){return cb(n,e,t)}async function cb(n,e,t){const r=j(n);if(pi(r.auth,e,Xt),me(r.auth.app))return Promise.reject(Ve(r.auth));await r.auth._initializationPromise;const i=Tr(r.auth,t);await pl(i,r.auth);const s=await mg(r);return i._openRedirect(r.auth,e,"reauthViaRedirect",s)}function ub(n,e,t){return lb(n,e,t)}async function lb(n,e,t){const r=j(n);pi(r.auth,e,Xt),await r.auth._initializationPromise;const i=Tr(r.auth,t);await Da(!1,r,e.providerId),await pl(i,r.auth);const s=await mg(r);return i._openRedirect(r.auth,e,"linkViaRedirect",s)}async function hb(n,e){return await Ee(n)._initializationPromise,pg(n,e,!1)}async function pg(n,e,t=!1){if(me(n.app))return Promise.reject(Ve(n));const r=Ee(n),i=Tr(r,e),o=await new nb(r,i,t).execute();return o&&!t&&(delete o.user._redirectEventId,await r._persistUserIfCurrent(o.user),await r._setRedirectUser(null,e)),o}async function mg(n){const e=xa(`${n.uid}:::`);return n._redirectEventId=e,await n.auth._setRedirectUser(n),await n.auth._persistUserIfCurrent(n),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const db=600*1e3;class fb{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(t=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!pb(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var r;if(e.error&&!gg(e)){const i=((r=e.error.code)===null||r===void 0?void 0:r.split("auth/")[1])||"internal-error";t.onError(Ye(this.auth,i))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const r=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=db&&this.cachedEventUids.clear(),this.cachedEventUids.has(af(e))}saveEventToCache(e){this.cachedEventUids.add(af(e)),this.lastProcessedEventTime=Date.now()}}function af(n){return[n.type,n.eventId,n.sessionId,n.tenantId].filter(e=>e).join("-")}function gg({type:n,error:e}){return n==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function pb(n){switch(n.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return gg(n);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function mb(n,e={}){return fe(n,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gb=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,_b=/^https?/;async function yb(n){if(n.config.emulator)return;const{authorizedDomains:e}=await mb(n);for(const t of e)try{if(Ib(t))return}catch{}st(n,"unauthorized-domain")}function Ib(n){const e=As(),{protocol:t,hostname:r}=new URL(e);if(n.startsWith("chrome-extension://")){const o=new URL(n);return o.hostname===""&&r===""?t==="chrome-extension:"&&n.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===r}if(!_b.test(t))return!1;if(gb.test(n))return r===n;const i=n.replace(/\./g,"\\.");return new RegExp("^(.+\\."+i+"|"+i+")$","i").test(r)}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Tb=new qs(3e4,6e4);function cf(){const n=Re().___jsl;if(n!=null&&n.H){for(const e of Object.keys(n.H))if(n.H[e].r=n.H[e].r||[],n.H[e].L=n.H[e].L||[],n.H[e].r=[...n.H[e].L],n.CP)for(let t=0;t<n.CP.length;t++)n.CP[t]=null}}function Eb(n){return new Promise((e,t)=>{var r,i,s;function o(){cf(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{cf(),t(Ye(n,"network-request-failed"))},timeout:Tb.get()})}if(!((i=(r=Re().gapi)===null||r===void 0?void 0:r.iframes)===null||i===void 0)&&i.Iframe)e(gapi.iframes.getContext());else if(!((s=Re().gapi)===null||s===void 0)&&s.load)o();else{const c=Mm("iframefcb");return Re()[c]=()=>{gapi.load?o():t(Ye(n,"network-request-failed"))},rl(`${ew()}?onload=${c}`).catch(u=>t(u))}}).catch(e=>{throw Bo=null,e})}let Bo=null;function vb(n){return Bo=Bo||Eb(n),Bo}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wb=new qs(5e3,15e3),Ab="__/auth/iframe",bb="emulator/auth/iframe",Rb={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},Sb=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function Pb(n){const e=n.config;O(e.authDomain,n,"auth-domain-config-required");const t=e.emulator?tl(e,bb):`https://${n.config.authDomain}/${Ab}`,r={apiKey:e.apiKey,appName:n.name,v:Ir},i=Sb.get(n.config.apiHost);i&&(r.eid=i);const s=n._getFrameworks();return s.length&&(r.fw=s.join(",")),`${t}?${fi(r).slice(1)}`}async function Cb(n){const e=await vb(n),t=Re().gapi;return O(t,n,"internal-error"),e.open({where:document.body,url:Pb(n),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:Rb,dontclear:!0},r=>new Promise(async(i,s)=>{await r.restyle({setHideOnLeave:!1});const o=Ye(n,"network-request-failed"),c=Re().setTimeout(()=>{s(o)},wb.get());function u(){Re().clearTimeout(c),i(r)}r.ping(u).then(u,()=>{s(o)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kb={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},Db=500,Nb=600,Vb="_blank",Ob="http://localhost";class uf{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function xb(n,e,t,r=Db,i=Nb){const s=Math.max((window.screen.availHeight-i)/2,0).toString(),o=Math.max((window.screen.availWidth-r)/2,0).toString();let c="";const u=Object.assign(Object.assign({},kb),{width:r.toString(),height:i.toString(),top:s,left:o}),l=Pe().toLowerCase();t&&(c=km(l)?Vb:t),Pm(l)&&(e=e||Ob,u.scrollbars="yes");const d=Object.entries(u).reduce((m,[T,P])=>`${m}${T}=${P},`,"");if(zv(l)&&c!=="_self")return Lb(e||"",c),new uf(null);const p=window.open(e||"",c,d);O(p,n,"popup-blocked");try{p.focus()}catch{}return new uf(p)}function Lb(n,e){const t=document.createElement("a");t.href=n,t.target=e;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(r)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Mb="__/auth/handler",Fb="emulator/auth/handler",Ub=encodeURIComponent("fac");async function lf(n,e,t,r,i,s){O(n.config.authDomain,n,"auth-domain-config-required"),O(n.config.apiKey,n,"invalid-api-key");const o={apiKey:n.config.apiKey,appName:n.name,authType:t,redirectUrl:r,v:Ir,eventId:i};if(e instanceof Xt){e.setDefaultLanguage(n.languageCode),o.providerId=e.providerId||"",eE(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[d,p]of Object.entries({}))o[d]=p}if(e instanceof _i){const d=e.getScopes().filter(p=>p!=="");d.length>0&&(o.scopes=d.join(","))}n.tenantId&&(o.tid=n.tenantId);const c=o;for(const d of Object.keys(c))c[d]===void 0&&delete c[d];const u=await n._getAppCheckToken(),l=u?`#${Ub}=${encodeURIComponent(u)}`:"";return`${Bb(n)}?${fi(c).slice(1)}${l}`}function Bb({config:n}){return n.emulator?tl(n,Fb):`https://${n.authDomain}/${Mb}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Qc="webStorageSupport";class qb{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=ll,this._completeRedirectFn=pg,this._overrideRedirectResult=ib}async _openPopup(e,t,r,i){var s;Kt((s=this.eventManagers[e._key()])===null||s===void 0?void 0:s.manager,"_initialize() not called before _openPopup()");const o=await lf(e,t,r,As(),i);return xb(e,o,xa())}async _openRedirect(e,t,r,i){await this._originValidation(e);const s=await lf(e,t,r,As(),i);return RA(s),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:i,promise:s}=this.eventManagers[t];return i?Promise.resolve(i):(Kt(s,"If manager is not set, promise should be"),s)}const r=this.initAndGetManager(e);return this.eventManagers[t]={promise:r},r.catch(()=>{delete this.eventManagers[t]}),r}async initAndGetManager(e){const t=await Cb(e),r=new fb(e);return t.register("authEvent",i=>(O(i==null?void 0:i.authEvent,e,"invalid-auth-event"),{status:r.onEvent(i.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=t,r}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(Qc,{type:Qc},i=>{var s;const o=(s=i==null?void 0:i[0])===null||s===void 0?void 0:s[Qc];o!==void 0&&t(!!o),st(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=yb(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return xm()||Cm()||nl()}}const _g=qb;class yg{constructor(e){this.factorId=e}_process(e,t,r){switch(t.type){case"enroll":return this._finalizeEnroll(e,t.credential,r);case"signin":return this._finalizeSignIn(e,t.credential);default:return At("unexpected MultiFactorSessionType")}}}class ml extends yg{constructor(e){super("phone"),this.credential=e}static _fromCredential(e){return new ml(e)}_finalizeEnroll(e,t,r){return mA(e,{idToken:t,displayName:r,phoneVerificationInfo:this.credential._makeVerificationRequest()})}_finalizeSignIn(e,t){return xA(e,{mfaPendingCredential:t,phoneVerificationInfo:this.credential._makeVerificationRequest()})}}class Ig{constructor(){}static assertion(e){return ml._fromCredential(e)}}Ig.FACTOR_ID="phone";class Tg{static assertionForEnrollment(e,t){return Ss._fromSecret(e,t)}static assertionForSignIn(e,t){return Ss._fromEnrollmentId(e,t)}static async generateSecret(e){var t;const r=e;O(typeof((t=r.user)===null||t===void 0?void 0:t.auth)<"u","internal-error");const i=await gA(r.user.auth,{idToken:r.credential,totpEnrollmentInfo:{}});return Fa._fromStartTotpMfaEnrollmentResponse(i,r.user.auth)}}Tg.FACTOR_ID="totp";class Ss extends yg{constructor(e,t,r){super("totp"),this.otp=e,this.enrollmentId=t,this.secret=r}static _fromSecret(e,t){return new Ss(t,void 0,e)}static _fromEnrollmentId(e,t){return new Ss(t,e)}async _finalizeEnroll(e,t,r){return O(typeof this.secret<"u",e,"argument-error"),_A(e,{idToken:t,displayName:r,totpVerificationInfo:this.secret._makeTotpVerificationInfo(this.otp)})}async _finalizeSignIn(e,t){O(this.enrollmentId!==void 0&&this.otp!==void 0,e,"argument-error");const r={verificationCode:this.otp};return LA(e,{mfaPendingCredential:t,mfaEnrollmentId:this.enrollmentId,totpVerificationInfo:r})}}class Fa{constructor(e,t,r,i,s,o,c){this.sessionInfo=o,this.auth=c,this.secretKey=e,this.hashingAlgorithm=t,this.codeLength=r,this.codeIntervalSeconds=i,this.enrollmentCompletionDeadline=s}static _fromStartTotpMfaEnrollmentResponse(e,t){return new Fa(e.totpSessionInfo.sharedSecretKey,e.totpSessionInfo.hashingAlgorithm,e.totpSessionInfo.verificationCodeLength,e.totpSessionInfo.periodSec,new Date(e.totpSessionInfo.finalizeEnrollmentTime).toUTCString(),e.totpSessionInfo.sessionInfo,t)}_makeTotpVerificationInfo(e){return{sessionInfo:this.sessionInfo,verificationCode:e}}generateQrCodeUrl(e,t){var r;let i=!1;return(Ro(e)||Ro(t))&&(i=!0),i&&(Ro(e)&&(e=((r=this.auth.currentUser)===null||r===void 0?void 0:r.email)||"unknownuser"),Ro(t)&&(t=this.auth.name)),`otpauth://totp/${t}:${e}?secret=${this.secretKey}&issuer=${t}&algorithm=${this.hashingAlgorithm}&digits=${this.codeLength}`}}function Ro(n){return typeof n>"u"||(n==null?void 0:n.length)===0}var hf="@firebase/auth",df="1.10.8";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jb{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)===null||e===void 0?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(r=>{e((r==null?void 0:r.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){O(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $b(n){switch(n){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function zb(n){Et(new ft("auth",(e,{options:t})=>{const r=e.getProvider("app").getImmediate(),i=e.getProvider("heartbeat"),s=e.getProvider("app-check-internal"),{apiKey:o,authDomain:c}=r.options;O(o&&!o.includes(":"),"invalid-api-key",{appName:r.name});const u={apiKey:o,authDomain:c,clientPlatform:n,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:Lm(n)},l=new Yv(r,i,s,u);return uw(l,t),l},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,r)=>{e.getProvider("auth-internal").initialize()})),Et(new ft("auth-internal",e=>{const t=Ee(e.getProvider("auth").getImmediate());return(r=>new jb(r))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),tt(hf,df,$b(n)),tt(hf,df,"esm2017")}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gb=300,Kb=sm("authIdTokenMaxAge")||Gb;let ff=null;const Wb=n=>async e=>{const t=e&&await e.getIdTokenResult(),r=t&&(new Date().getTime()-Date.parse(t.issuedAtTime))/1e3;if(r&&r>Kb)return;const i=t==null?void 0:t.token;ff!==i&&(ff=i,await fetch(n,{method:i?"POST":"DELETE",headers:i?{Authorization:`Bearer ${i}`}:{}}))};function Hb(n=Pa()){const e=Nt(n,"auth");if(e.isInitialized())return e.getImmediate();const t=Bm(n,{popupRedirectResolver:_g,persistence:[lg,ig,ll]}),r=sm("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){const s=new URL(r,location.origin);if(location.origin===s.origin){const o=Wb(s.toString());tg(t,o,()=>o(t.currentUser)),eg(t,c=>o(c))}}const i=nm("auth");return i&&qm(t,`http://${i}`),t}function Qb(){var n,e;return(e=(n=document.getElementsByTagName("head"))===null||n===void 0?void 0:n[0])!==null&&e!==void 0?e:document}Jv({loadJS(n){return new Promise((e,t)=>{const r=document.createElement("script");r.setAttribute("src",n),r.onload=e,r.onerror=i=>{const s=Ye("internal-error");s.customData=i,t(s)},r.type="text/javascript",r.charset="UTF-8",Qb().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});zb("Browser");const mN=Object.freeze(Object.defineProperty({__proto__:null,ActionCodeOperation:wv,ActionCodeURL:gi,AuthCredential:mi,AuthErrorCodes:Rv,EmailAuthCredential:Gr,EmailAuthProvider:Dn,FacebookAuthProvider:Lt,FactorId:Iv,GithubAuthProvider:Ft,GoogleAuthProvider:Mt,OAuthCredential:kt,OAuthProvider:ls,OperationType:vv,PhoneAuthCredential:Tn,PhoneAuthProvider:tr,PhoneMultiFactorGenerator:Ig,ProviderId:Tv,RecaptchaVerifier:jA,SAMLAuthProvider:na,SignInMethod:Ev,TotpMultiFactorGenerator:Tg,TotpSecret:Fa,TwitterAuthProvider:Ut,applyActionCode:Fw,beforeAuthStateChanged:tg,browserCookiePersistence:wA,browserLocalPersistence:ig,browserPopupRedirectResolver:_g,browserSessionPersistence:ll,checkActionCode:Jm,confirmPasswordReset:Mw,connectAuthEmulator:qm,createUserWithEmailAndPassword:Bw,debugErrorMap:bv,deleteUser:fA,fetchSignInMethodsForEmail:Kw,getAdditionalUserInfo:iA,getAuth:Hb,getIdToken:Fv,getIdTokenResult:Am,getMultiFactorResolver:pA,getRedirectResult:hb,inMemoryPersistence:pu,indexedDBLocalPersistence:lg,initializeAuth:Bm,initializeRecaptchaConfig:oA,isSignInWithEmailLink:$w,linkWithCredential:Qm,linkWithPhoneNumber:GA,linkWithPopup:eb,linkWithRedirect:ub,multiFactor:IA,onAuthStateChanged:cA,onIdTokenChanged:eg,parseActionCodeURL:Cw,prodErrorMap:_m,reauthenticateWithCredential:Ym,reauthenticateWithPhoneNumber:KA,reauthenticateWithPopup:ZA,reauthenticateWithRedirect:ab,reload:bm,revokeAccessToken:dA,sendEmailVerification:Ww,sendPasswordResetEmail:Lw,sendSignInLinkToEmail:jw,setPersistence:sA,signInAnonymously:Nw,signInWithCredential:Na,signInWithCustomToken:xw,signInWithEmailAndPassword:qw,signInWithEmailLink:zw,signInWithPhoneNumber:zA,signInWithPopup:XA,signInWithRedirect:sb,signOut:hA,unlink:Vw,updateCurrentUser:lA,updateEmail:Jw,updatePassword:Xw,updatePhoneNumber:WA,updateProfile:Yw,useDeviceLanguage:uA,validatePassword:aA,verifyBeforeUpdateEmail:Hw,verifyPasswordResetCode:Uw},Symbol.toStringTag,{value:"Module"}));var pf=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var En,Eg;(function(){var n;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(E,_){function I(){}I.prototype=_.prototype,E.D=_.prototype,E.prototype=new I,E.prototype.constructor=E,E.C=function(v,w,S){for(var y=Array(arguments.length-2),Vt=2;Vt<arguments.length;Vt++)y[Vt-2]=arguments[Vt];return _.prototype[w].apply(v,y)}}function t(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.B=Array(this.blockSize),this.o=this.h=0,this.s()}e(r,t),r.prototype.s=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function i(E,_,I){I||(I=0);var v=Array(16);if(typeof _=="string")for(var w=0;16>w;++w)v[w]=_.charCodeAt(I++)|_.charCodeAt(I++)<<8|_.charCodeAt(I++)<<16|_.charCodeAt(I++)<<24;else for(w=0;16>w;++w)v[w]=_[I++]|_[I++]<<8|_[I++]<<16|_[I++]<<24;_=E.g[0],I=E.g[1],w=E.g[2];var S=E.g[3],y=_+(S^I&(w^S))+v[0]+3614090360&4294967295;_=I+(y<<7&4294967295|y>>>25),y=S+(w^_&(I^w))+v[1]+3905402710&4294967295,S=_+(y<<12&4294967295|y>>>20),y=w+(I^S&(_^I))+v[2]+606105819&4294967295,w=S+(y<<17&4294967295|y>>>15),y=I+(_^w&(S^_))+v[3]+3250441966&4294967295,I=w+(y<<22&4294967295|y>>>10),y=_+(S^I&(w^S))+v[4]+4118548399&4294967295,_=I+(y<<7&4294967295|y>>>25),y=S+(w^_&(I^w))+v[5]+1200080426&4294967295,S=_+(y<<12&4294967295|y>>>20),y=w+(I^S&(_^I))+v[6]+2821735955&4294967295,w=S+(y<<17&4294967295|y>>>15),y=I+(_^w&(S^_))+v[7]+4249261313&4294967295,I=w+(y<<22&4294967295|y>>>10),y=_+(S^I&(w^S))+v[8]+1770035416&4294967295,_=I+(y<<7&4294967295|y>>>25),y=S+(w^_&(I^w))+v[9]+2336552879&4294967295,S=_+(y<<12&4294967295|y>>>20),y=w+(I^S&(_^I))+v[10]+4294925233&4294967295,w=S+(y<<17&4294967295|y>>>15),y=I+(_^w&(S^_))+v[11]+2304563134&4294967295,I=w+(y<<22&4294967295|y>>>10),y=_+(S^I&(w^S))+v[12]+1804603682&4294967295,_=I+(y<<7&4294967295|y>>>25),y=S+(w^_&(I^w))+v[13]+4254626195&4294967295,S=_+(y<<12&4294967295|y>>>20),y=w+(I^S&(_^I))+v[14]+2792965006&4294967295,w=S+(y<<17&4294967295|y>>>15),y=I+(_^w&(S^_))+v[15]+1236535329&4294967295,I=w+(y<<22&4294967295|y>>>10),y=_+(w^S&(I^w))+v[1]+4129170786&4294967295,_=I+(y<<5&4294967295|y>>>27),y=S+(I^w&(_^I))+v[6]+3225465664&4294967295,S=_+(y<<9&4294967295|y>>>23),y=w+(_^I&(S^_))+v[11]+643717713&4294967295,w=S+(y<<14&4294967295|y>>>18),y=I+(S^_&(w^S))+v[0]+3921069994&4294967295,I=w+(y<<20&4294967295|y>>>12),y=_+(w^S&(I^w))+v[5]+3593408605&4294967295,_=I+(y<<5&4294967295|y>>>27),y=S+(I^w&(_^I))+v[10]+38016083&4294967295,S=_+(y<<9&4294967295|y>>>23),y=w+(_^I&(S^_))+v[15]+3634488961&4294967295,w=S+(y<<14&4294967295|y>>>18),y=I+(S^_&(w^S))+v[4]+3889429448&4294967295,I=w+(y<<20&4294967295|y>>>12),y=_+(w^S&(I^w))+v[9]+568446438&4294967295,_=I+(y<<5&4294967295|y>>>27),y=S+(I^w&(_^I))+v[14]+3275163606&4294967295,S=_+(y<<9&4294967295|y>>>23),y=w+(_^I&(S^_))+v[3]+4107603335&4294967295,w=S+(y<<14&4294967295|y>>>18),y=I+(S^_&(w^S))+v[8]+1163531501&4294967295,I=w+(y<<20&4294967295|y>>>12),y=_+(w^S&(I^w))+v[13]+2850285829&4294967295,_=I+(y<<5&4294967295|y>>>27),y=S+(I^w&(_^I))+v[2]+4243563512&4294967295,S=_+(y<<9&4294967295|y>>>23),y=w+(_^I&(S^_))+v[7]+1735328473&4294967295,w=S+(y<<14&4294967295|y>>>18),y=I+(S^_&(w^S))+v[12]+2368359562&4294967295,I=w+(y<<20&4294967295|y>>>12),y=_+(I^w^S)+v[5]+4294588738&4294967295,_=I+(y<<4&4294967295|y>>>28),y=S+(_^I^w)+v[8]+2272392833&4294967295,S=_+(y<<11&4294967295|y>>>21),y=w+(S^_^I)+v[11]+1839030562&4294967295,w=S+(y<<16&4294967295|y>>>16),y=I+(w^S^_)+v[14]+4259657740&4294967295,I=w+(y<<23&4294967295|y>>>9),y=_+(I^w^S)+v[1]+2763975236&4294967295,_=I+(y<<4&4294967295|y>>>28),y=S+(_^I^w)+v[4]+1272893353&4294967295,S=_+(y<<11&4294967295|y>>>21),y=w+(S^_^I)+v[7]+4139469664&4294967295,w=S+(y<<16&4294967295|y>>>16),y=I+(w^S^_)+v[10]+3200236656&4294967295,I=w+(y<<23&4294967295|y>>>9),y=_+(I^w^S)+v[13]+681279174&4294967295,_=I+(y<<4&4294967295|y>>>28),y=S+(_^I^w)+v[0]+3936430074&4294967295,S=_+(y<<11&4294967295|y>>>21),y=w+(S^_^I)+v[3]+3572445317&4294967295,w=S+(y<<16&4294967295|y>>>16),y=I+(w^S^_)+v[6]+76029189&4294967295,I=w+(y<<23&4294967295|y>>>9),y=_+(I^w^S)+v[9]+3654602809&4294967295,_=I+(y<<4&4294967295|y>>>28),y=S+(_^I^w)+v[12]+3873151461&4294967295,S=_+(y<<11&4294967295|y>>>21),y=w+(S^_^I)+v[15]+530742520&4294967295,w=S+(y<<16&4294967295|y>>>16),y=I+(w^S^_)+v[2]+3299628645&4294967295,I=w+(y<<23&4294967295|y>>>9),y=_+(w^(I|~S))+v[0]+4096336452&4294967295,_=I+(y<<6&4294967295|y>>>26),y=S+(I^(_|~w))+v[7]+1126891415&4294967295,S=_+(y<<10&4294967295|y>>>22),y=w+(_^(S|~I))+v[14]+2878612391&4294967295,w=S+(y<<15&4294967295|y>>>17),y=I+(S^(w|~_))+v[5]+4237533241&4294967295,I=w+(y<<21&4294967295|y>>>11),y=_+(w^(I|~S))+v[12]+1700485571&4294967295,_=I+(y<<6&4294967295|y>>>26),y=S+(I^(_|~w))+v[3]+2399980690&4294967295,S=_+(y<<10&4294967295|y>>>22),y=w+(_^(S|~I))+v[10]+4293915773&4294967295,w=S+(y<<15&4294967295|y>>>17),y=I+(S^(w|~_))+v[1]+2240044497&4294967295,I=w+(y<<21&4294967295|y>>>11),y=_+(w^(I|~S))+v[8]+1873313359&4294967295,_=I+(y<<6&4294967295|y>>>26),y=S+(I^(_|~w))+v[15]+4264355552&4294967295,S=_+(y<<10&4294967295|y>>>22),y=w+(_^(S|~I))+v[6]+2734768916&4294967295,w=S+(y<<15&4294967295|y>>>17),y=I+(S^(w|~_))+v[13]+1309151649&4294967295,I=w+(y<<21&4294967295|y>>>11),y=_+(w^(I|~S))+v[4]+4149444226&4294967295,_=I+(y<<6&4294967295|y>>>26),y=S+(I^(_|~w))+v[11]+3174756917&4294967295,S=_+(y<<10&4294967295|y>>>22),y=w+(_^(S|~I))+v[2]+718787259&4294967295,w=S+(y<<15&4294967295|y>>>17),y=I+(S^(w|~_))+v[9]+3951481745&4294967295,E.g[0]=E.g[0]+_&4294967295,E.g[1]=E.g[1]+(w+(y<<21&4294967295|y>>>11))&4294967295,E.g[2]=E.g[2]+w&4294967295,E.g[3]=E.g[3]+S&4294967295}r.prototype.u=function(E,_){_===void 0&&(_=E.length);for(var I=_-this.blockSize,v=this.B,w=this.h,S=0;S<_;){if(w==0)for(;S<=I;)i(this,E,S),S+=this.blockSize;if(typeof E=="string"){for(;S<_;)if(v[w++]=E.charCodeAt(S++),w==this.blockSize){i(this,v),w=0;break}}else for(;S<_;)if(v[w++]=E[S++],w==this.blockSize){i(this,v),w=0;break}}this.h=w,this.o+=_},r.prototype.v=function(){var E=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);E[0]=128;for(var _=1;_<E.length-8;++_)E[_]=0;var I=8*this.o;for(_=E.length-8;_<E.length;++_)E[_]=I&255,I/=256;for(this.u(E),E=Array(16),_=I=0;4>_;++_)for(var v=0;32>v;v+=8)E[I++]=this.g[_]>>>v&255;return E};function s(E,_){var I=c;return Object.prototype.hasOwnProperty.call(I,E)?I[E]:I[E]=_(E)}function o(E,_){this.h=_;for(var I=[],v=!0,w=E.length-1;0<=w;w--){var S=E[w]|0;v&&S==_||(I[w]=S,v=!1)}this.g=I}var c={};function u(E){return-128<=E&&128>E?s(E,function(_){return new o([_|0],0>_?-1:0)}):new o([E|0],0>E?-1:0)}function l(E){if(isNaN(E)||!isFinite(E))return p;if(0>E)return k(l(-E));for(var _=[],I=1,v=0;E>=I;v++)_[v]=E/I|0,I*=4294967296;return new o(_,0)}function d(E,_){if(E.length==0)throw Error("number format error: empty string");if(_=_||10,2>_||36<_)throw Error("radix out of range: "+_);if(E.charAt(0)=="-")return k(d(E.substring(1),_));if(0<=E.indexOf("-"))throw Error('number format error: interior "-" character');for(var I=l(Math.pow(_,8)),v=p,w=0;w<E.length;w+=8){var S=Math.min(8,E.length-w),y=parseInt(E.substring(w,w+S),_);8>S?(S=l(Math.pow(_,S)),v=v.j(S).add(l(y))):(v=v.j(I),v=v.add(l(y)))}return v}var p=u(0),m=u(1),T=u(16777216);n=o.prototype,n.m=function(){if(D(this))return-k(this).m();for(var E=0,_=1,I=0;I<this.g.length;I++){var v=this.i(I);E+=(0<=v?v:4294967296+v)*_,_*=4294967296}return E},n.toString=function(E){if(E=E||10,2>E||36<E)throw Error("radix out of range: "+E);if(P(this))return"0";if(D(this))return"-"+k(this).toString(E);for(var _=l(Math.pow(E,6)),I=this,v="";;){var w=G(I,_).g;I=U(I,w.j(_));var S=((0<I.g.length?I.g[0]:I.h)>>>0).toString(E);if(I=w,P(I))return S+v;for(;6>S.length;)S="0"+S;v=S+v}},n.i=function(E){return 0>E?0:E<this.g.length?this.g[E]:this.h};function P(E){if(E.h!=0)return!1;for(var _=0;_<E.g.length;_++)if(E.g[_]!=0)return!1;return!0}function D(E){return E.h==-1}n.l=function(E){return E=U(this,E),D(E)?-1:P(E)?0:1};function k(E){for(var _=E.g.length,I=[],v=0;v<_;v++)I[v]=~E.g[v];return new o(I,~E.h).add(m)}n.abs=function(){return D(this)?k(this):this},n.add=function(E){for(var _=Math.max(this.g.length,E.g.length),I=[],v=0,w=0;w<=_;w++){var S=v+(this.i(w)&65535)+(E.i(w)&65535),y=(S>>>16)+(this.i(w)>>>16)+(E.i(w)>>>16);v=y>>>16,S&=65535,y&=65535,I[w]=y<<16|S}return new o(I,I[I.length-1]&-2147483648?-1:0)};function U(E,_){return E.add(k(_))}n.j=function(E){if(P(this)||P(E))return p;if(D(this))return D(E)?k(this).j(k(E)):k(k(this).j(E));if(D(E))return k(this.j(k(E)));if(0>this.l(T)&&0>E.l(T))return l(this.m()*E.m());for(var _=this.g.length+E.g.length,I=[],v=0;v<2*_;v++)I[v]=0;for(v=0;v<this.g.length;v++)for(var w=0;w<E.g.length;w++){var S=this.i(v)>>>16,y=this.i(v)&65535,Vt=E.i(w)>>>16,ki=E.i(w)&65535;I[2*v+2*w]+=y*ki,B(I,2*v+2*w),I[2*v+2*w+1]+=S*ki,B(I,2*v+2*w+1),I[2*v+2*w+1]+=y*Vt,B(I,2*v+2*w+1),I[2*v+2*w+2]+=S*Vt,B(I,2*v+2*w+2)}for(v=0;v<_;v++)I[v]=I[2*v+1]<<16|I[2*v];for(v=_;v<2*_;v++)I[v]=0;return new o(I,0)};function B(E,_){for(;(E[_]&65535)!=E[_];)E[_+1]+=E[_]>>>16,E[_]&=65535,_++}function M(E,_){this.g=E,this.h=_}function G(E,_){if(P(_))throw Error("division by zero");if(P(E))return new M(p,p);if(D(E))return _=G(k(E),_),new M(k(_.g),k(_.h));if(D(_))return _=G(E,k(_)),new M(k(_.g),_.h);if(30<E.g.length){if(D(E)||D(_))throw Error("slowDivide_ only works with positive integers.");for(var I=m,v=_;0>=v.l(E);)I=J(I),v=J(v);var w=W(I,1),S=W(v,1);for(v=W(v,2),I=W(I,2);!P(v);){var y=S.add(v);0>=y.l(E)&&(w=w.add(I),S=y),v=W(v,1),I=W(I,1)}return _=U(E,w.j(_)),new M(w,_)}for(w=p;0<=E.l(_);){for(I=Math.max(1,Math.floor(E.m()/_.m())),v=Math.ceil(Math.log(I)/Math.LN2),v=48>=v?1:Math.pow(2,v-48),S=l(I),y=S.j(_);D(y)||0<y.l(E);)I-=v,S=l(I),y=S.j(_);P(S)&&(S=m),w=w.add(S),E=U(E,y)}return new M(w,E)}n.A=function(E){return G(this,E).h},n.and=function(E){for(var _=Math.max(this.g.length,E.g.length),I=[],v=0;v<_;v++)I[v]=this.i(v)&E.i(v);return new o(I,this.h&E.h)},n.or=function(E){for(var _=Math.max(this.g.length,E.g.length),I=[],v=0;v<_;v++)I[v]=this.i(v)|E.i(v);return new o(I,this.h|E.h)},n.xor=function(E){for(var _=Math.max(this.g.length,E.g.length),I=[],v=0;v<_;v++)I[v]=this.i(v)^E.i(v);return new o(I,this.h^E.h)};function J(E){for(var _=E.g.length+1,I=[],v=0;v<_;v++)I[v]=E.i(v)<<1|E.i(v-1)>>>31;return new o(I,E.h)}function W(E,_){var I=_>>5;_%=32;for(var v=E.g.length-I,w=[],S=0;S<v;S++)w[S]=0<_?E.i(S+I)>>>_|E.i(S+I+1)<<32-_:E.i(S+I);return new o(w,E.h)}r.prototype.digest=r.prototype.v,r.prototype.reset=r.prototype.s,r.prototype.update=r.prototype.u,Eg=r,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.A,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=l,o.fromString=d,En=o}).apply(typeof pf<"u"?pf:typeof self<"u"?self:typeof window<"u"?window:{});var So=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var vg,rs,wg,qo,gu,Ag,bg,Rg;(function(){var n,e=typeof Object.defineProperties=="function"?Object.defineProperty:function(a,h,f){return a==Array.prototype||a==Object.prototype||(a[h]=f.value),a};function t(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof So=="object"&&So];for(var h=0;h<a.length;++h){var f=a[h];if(f&&f.Math==Math)return f}throw Error("Cannot find global object")}var r=t(this);function i(a,h){if(h)e:{var f=r;a=a.split(".");for(var g=0;g<a.length-1;g++){var b=a[g];if(!(b in f))break e;f=f[b]}a=a[a.length-1],g=f[a],h=h(g),h!=g&&h!=null&&e(f,a,{configurable:!0,writable:!0,value:h})}}function s(a,h){a instanceof String&&(a+="");var f=0,g=!1,b={next:function(){if(!g&&f<a.length){var C=f++;return{value:h(C,a[C]),done:!1}}return g=!0,{done:!0,value:void 0}}};return b[Symbol.iterator]=function(){return b},b}i("Array.prototype.values",function(a){return a||function(){return s(this,function(h,f){return f})}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var o=o||{},c=this||self;function u(a){var h=typeof a;return h=h!="object"?h:a?Array.isArray(a)?"array":h:"null",h=="array"||h=="object"&&typeof a.length=="number"}function l(a){var h=typeof a;return h=="object"&&a!=null||h=="function"}function d(a,h,f){return a.call.apply(a.bind,arguments)}function p(a,h,f){if(!a)throw Error();if(2<arguments.length){var g=Array.prototype.slice.call(arguments,2);return function(){var b=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(b,g),a.apply(h,b)}}return function(){return a.apply(h,arguments)}}function m(a,h,f){return m=Function.prototype.bind&&Function.prototype.bind.toString().indexOf("native code")!=-1?d:p,m.apply(null,arguments)}function T(a,h){var f=Array.prototype.slice.call(arguments,1);return function(){var g=f.slice();return g.push.apply(g,arguments),a.apply(this,g)}}function P(a,h){function f(){}f.prototype=h.prototype,a.aa=h.prototype,a.prototype=new f,a.prototype.constructor=a,a.Qb=function(g,b,C){for(var F=Array(arguments.length-2),ae=2;ae<arguments.length;ae++)F[ae-2]=arguments[ae];return h.prototype[b].apply(g,F)}}function D(a){const h=a.length;if(0<h){const f=Array(h);for(let g=0;g<h;g++)f[g]=a[g];return f}return[]}function k(a,h){for(let f=1;f<arguments.length;f++){const g=arguments[f];if(u(g)){const b=a.length||0,C=g.length||0;a.length=b+C;for(let F=0;F<C;F++)a[b+F]=g[F]}else a.push(g)}}class U{constructor(h,f){this.i=h,this.j=f,this.h=0,this.g=null}get(){let h;return 0<this.h?(this.h--,h=this.g,this.g=h.next,h.next=null):h=this.i(),h}}function B(a){return/^[\s\xa0]*$/.test(a)}function M(){var a=c.navigator;return a&&(a=a.userAgent)?a:""}function G(a){return G[" "](a),a}G[" "]=function(){};var J=M().indexOf("Gecko")!=-1&&!(M().toLowerCase().indexOf("webkit")!=-1&&M().indexOf("Edge")==-1)&&!(M().indexOf("Trident")!=-1||M().indexOf("MSIE")!=-1)&&M().indexOf("Edge")==-1;function W(a,h,f){for(const g in a)h.call(f,a[g],g,a)}function E(a,h){for(const f in a)h.call(void 0,a[f],f,a)}function _(a){const h={};for(const f in a)h[f]=a[f];return h}const I="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function v(a,h){let f,g;for(let b=1;b<arguments.length;b++){g=arguments[b];for(f in g)a[f]=g[f];for(let C=0;C<I.length;C++)f=I[C],Object.prototype.hasOwnProperty.call(g,f)&&(a[f]=g[f])}}function w(a){var h=1;a=a.split(":");const f=[];for(;0<h&&a.length;)f.push(a.shift()),h--;return a.length&&f.push(a.join(":")),f}function S(a){c.setTimeout(()=>{throw a},0)}function y(){var a=pc;let h=null;return a.g&&(h=a.g,a.g=a.g.next,a.g||(a.h=null),h.next=null),h}class Vt{constructor(){this.h=this.g=null}add(h,f){const g=ki.get();g.set(h,f),this.h?this.h.next=g:this.g=g,this.h=g}}var ki=new U(()=>new nT,a=>a.reset());class nT{constructor(){this.next=this.g=this.h=null}set(h,f){this.h=h,this.g=f,this.next=null}reset(){this.next=this.g=this.h=null}}let Di,Ni=!1,pc=new Vt,Oh=()=>{const a=c.Promise.resolve(void 0);Di=()=>{a.then(rT)}};var rT=()=>{for(var a;a=y();){try{a.h.call(a.g)}catch(f){S(f)}var h=ki;h.j(a),100>h.h&&(h.h++,a.next=h.g,h.g=a)}Ni=!1};function rn(){this.s=this.s,this.C=this.C}rn.prototype.s=!1,rn.prototype.ma=function(){this.s||(this.s=!0,this.N())},rn.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function Fe(a,h){this.type=a,this.g=this.target=h,this.defaultPrevented=!1}Fe.prototype.h=function(){this.defaultPrevented=!0};var iT=(function(){if(!c.addEventListener||!Object.defineProperty)return!1;var a=!1,h=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const f=()=>{};c.addEventListener("test",f,h),c.removeEventListener("test",f,h)}catch{}return a})();function Vi(a,h){if(Fe.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a){var f=this.type=a.type,g=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;if(this.target=a.target||a.srcElement,this.g=h,h=a.relatedTarget){if(J){e:{try{G(h.nodeName);var b=!0;break e}catch{}b=!1}b||(h=null)}}else f=="mouseover"?h=a.fromElement:f=="mouseout"&&(h=a.toElement);this.relatedTarget=h,g?(this.clientX=g.clientX!==void 0?g.clientX:g.pageX,this.clientY=g.clientY!==void 0?g.clientY:g.pageY,this.screenX=g.screenX||0,this.screenY=g.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=typeof a.pointerType=="string"?a.pointerType:sT[a.pointerType]||"",this.state=a.state,this.i=a,a.defaultPrevented&&Vi.aa.h.call(this)}}P(Vi,Fe);var sT={2:"touch",3:"pen",4:"mouse"};Vi.prototype.h=function(){Vi.aa.h.call(this);var a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var so="closure_listenable_"+(1e6*Math.random()|0),oT=0;function aT(a,h,f,g,b){this.listener=a,this.proxy=null,this.src=h,this.type=f,this.capture=!!g,this.ha=b,this.key=++oT,this.da=this.fa=!1}function oo(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function ao(a){this.src=a,this.g={},this.h=0}ao.prototype.add=function(a,h,f,g,b){var C=a.toString();a=this.g[C],a||(a=this.g[C]=[],this.h++);var F=gc(a,h,g,b);return-1<F?(h=a[F],f||(h.fa=!1)):(h=new aT(h,this.src,C,!!g,b),h.fa=f,a.push(h)),h};function mc(a,h){var f=h.type;if(f in a.g){var g=a.g[f],b=Array.prototype.indexOf.call(g,h,void 0),C;(C=0<=b)&&Array.prototype.splice.call(g,b,1),C&&(oo(h),a.g[f].length==0&&(delete a.g[f],a.h--))}}function gc(a,h,f,g){for(var b=0;b<a.length;++b){var C=a[b];if(!C.da&&C.listener==h&&C.capture==!!f&&C.ha==g)return b}return-1}var _c="closure_lm_"+(1e6*Math.random()|0),yc={};function xh(a,h,f,g,b){if(Array.isArray(h)){for(var C=0;C<h.length;C++)xh(a,h[C],f,g,b);return null}return f=Fh(f),a&&a[so]?a.K(h,f,l(g)?!!g.capture:!1,b):cT(a,h,f,!1,g,b)}function cT(a,h,f,g,b,C){if(!h)throw Error("Invalid event type");var F=l(b)?!!b.capture:!!b,ae=Tc(a);if(ae||(a[_c]=ae=new ao(a)),f=ae.add(h,f,g,F,C),f.proxy)return f;if(g=uT(),f.proxy=g,g.src=a,g.listener=f,a.addEventListener)iT||(b=F),b===void 0&&(b=!1),a.addEventListener(h.toString(),g,b);else if(a.attachEvent)a.attachEvent(Mh(h.toString()),g);else if(a.addListener&&a.removeListener)a.addListener(g);else throw Error("addEventListener and attachEvent are unavailable.");return f}function uT(){function a(f){return h.call(a.src,a.listener,f)}const h=lT;return a}function Lh(a,h,f,g,b){if(Array.isArray(h))for(var C=0;C<h.length;C++)Lh(a,h[C],f,g,b);else g=l(g)?!!g.capture:!!g,f=Fh(f),a&&a[so]?(a=a.i,h=String(h).toString(),h in a.g&&(C=a.g[h],f=gc(C,f,g,b),-1<f&&(oo(C[f]),Array.prototype.splice.call(C,f,1),C.length==0&&(delete a.g[h],a.h--)))):a&&(a=Tc(a))&&(h=a.g[h.toString()],a=-1,h&&(a=gc(h,f,g,b)),(f=-1<a?h[a]:null)&&Ic(f))}function Ic(a){if(typeof a!="number"&&a&&!a.da){var h=a.src;if(h&&h[so])mc(h.i,a);else{var f=a.type,g=a.proxy;h.removeEventListener?h.removeEventListener(f,g,a.capture):h.detachEvent?h.detachEvent(Mh(f),g):h.addListener&&h.removeListener&&h.removeListener(g),(f=Tc(h))?(mc(f,a),f.h==0&&(f.src=null,h[_c]=null)):oo(a)}}}function Mh(a){return a in yc?yc[a]:yc[a]="on"+a}function lT(a,h){if(a.da)a=!0;else{h=new Vi(h,this);var f=a.listener,g=a.ha||a.src;a.fa&&Ic(a),a=f.call(g,h)}return a}function Tc(a){return a=a[_c],a instanceof ao?a:null}var Ec="__closure_events_fn_"+(1e9*Math.random()>>>0);function Fh(a){return typeof a=="function"?a:(a[Ec]||(a[Ec]=function(h){return a.handleEvent(h)}),a[Ec])}function Ue(){rn.call(this),this.i=new ao(this),this.M=this,this.F=null}P(Ue,rn),Ue.prototype[so]=!0,Ue.prototype.removeEventListener=function(a,h,f,g){Lh(this,a,h,f,g)};function We(a,h){var f,g=a.F;if(g)for(f=[];g;g=g.F)f.push(g);if(a=a.M,g=h.type||h,typeof h=="string")h=new Fe(h,a);else if(h instanceof Fe)h.target=h.target||a;else{var b=h;h=new Fe(g,a),v(h,b)}if(b=!0,f)for(var C=f.length-1;0<=C;C--){var F=h.g=f[C];b=co(F,g,!0,h)&&b}if(F=h.g=a,b=co(F,g,!0,h)&&b,b=co(F,g,!1,h)&&b,f)for(C=0;C<f.length;C++)F=h.g=f[C],b=co(F,g,!1,h)&&b}Ue.prototype.N=function(){if(Ue.aa.N.call(this),this.i){var a=this.i,h;for(h in a.g){for(var f=a.g[h],g=0;g<f.length;g++)oo(f[g]);delete a.g[h],a.h--}}this.F=null},Ue.prototype.K=function(a,h,f,g){return this.i.add(String(a),h,!1,f,g)},Ue.prototype.L=function(a,h,f,g){return this.i.add(String(a),h,!0,f,g)};function co(a,h,f,g){if(h=a.i.g[String(h)],!h)return!0;h=h.concat();for(var b=!0,C=0;C<h.length;++C){var F=h[C];if(F&&!F.da&&F.capture==f){var ae=F.listener,xe=F.ha||F.src;F.fa&&mc(a.i,F),b=ae.call(xe,g)!==!1&&b}}return b&&!g.defaultPrevented}function Uh(a,h,f){if(typeof a=="function")f&&(a=m(a,f));else if(a&&typeof a.handleEvent=="function")a=m(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<Number(h)?-1:c.setTimeout(a,h||0)}function Bh(a){a.g=Uh(()=>{a.g=null,a.i&&(a.i=!1,Bh(a))},a.l);const h=a.h;a.h=null,a.m.apply(null,h)}class hT extends rn{constructor(h,f){super(),this.m=h,this.l=f,this.h=null,this.i=!1,this.g=null}j(h){this.h=arguments,this.g?this.i=!0:Bh(this)}N(){super.N(),this.g&&(c.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Oi(a){rn.call(this),this.h=a,this.g={}}P(Oi,rn);var qh=[];function jh(a){W(a.g,function(h,f){this.g.hasOwnProperty(f)&&Ic(h)},a),a.g={}}Oi.prototype.N=function(){Oi.aa.N.call(this),jh(this)},Oi.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var vc=c.JSON.stringify,dT=c.JSON.parse,fT=class{stringify(a){return c.JSON.stringify(a,void 0)}parse(a){return c.JSON.parse(a,void 0)}};function wc(){}wc.prototype.h=null;function $h(a){return a.h||(a.h=a.i())}function zh(){}var xi={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function Ac(){Fe.call(this,"d")}P(Ac,Fe);function bc(){Fe.call(this,"c")}P(bc,Fe);var Bn={},Gh=null;function uo(){return Gh=Gh||new Ue}Bn.La="serverreachability";function Kh(a){Fe.call(this,Bn.La,a)}P(Kh,Fe);function Li(a){const h=uo();We(h,new Kh(h))}Bn.STAT_EVENT="statevent";function Wh(a,h){Fe.call(this,Bn.STAT_EVENT,a),this.stat=h}P(Wh,Fe);function He(a){const h=uo();We(h,new Wh(h,a))}Bn.Ma="timingevent";function Hh(a,h){Fe.call(this,Bn.Ma,a),this.size=h}P(Hh,Fe);function Mi(a,h){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return c.setTimeout(function(){a()},h)}function Fi(){this.g=!0}Fi.prototype.xa=function(){this.g=!1};function pT(a,h,f,g,b,C){a.info(function(){if(a.g)if(C)for(var F="",ae=C.split("&"),xe=0;xe<ae.length;xe++){var te=ae[xe].split("=");if(1<te.length){var Be=te[0];te=te[1];var qe=Be.split("_");F=2<=qe.length&&qe[1]=="type"?F+(Be+"="+te+"&"):F+(Be+"=redacted&")}}else F=null;else F=C;return"XMLHTTP REQ ("+g+") [attempt "+b+"]: "+h+`
`+f+`
`+F})}function mT(a,h,f,g,b,C,F){a.info(function(){return"XMLHTTP RESP ("+g+") [ attempt "+b+"]: "+h+`
`+f+`
`+C+" "+F})}function Rr(a,h,f,g){a.info(function(){return"XMLHTTP TEXT ("+h+"): "+_T(a,f)+(g?" "+g:"")})}function gT(a,h){a.info(function(){return"TIMEOUT: "+h})}Fi.prototype.info=function(){};function _T(a,h){if(!a.g)return h;if(!h)return null;try{var f=JSON.parse(h);if(f){for(a=0;a<f.length;a++)if(Array.isArray(f[a])){var g=f[a];if(!(2>g.length)){var b=g[1];if(Array.isArray(b)&&!(1>b.length)){var C=b[0];if(C!="noop"&&C!="stop"&&C!="close")for(var F=1;F<b.length;F++)b[F]=""}}}}return vc(f)}catch{return h}}var lo={NO_ERROR:0,gb:1,tb:2,sb:3,nb:4,rb:5,ub:6,Ia:7,TIMEOUT:8,xb:9},Qh={lb:"complete",Hb:"success",Ja:"error",Ia:"abort",zb:"ready",Ab:"readystatechange",TIMEOUT:"timeout",vb:"incrementaldata",yb:"progress",ob:"downloadprogress",Pb:"uploadprogress"},Rc;function ho(){}P(ho,wc),ho.prototype.g=function(){return new XMLHttpRequest},ho.prototype.i=function(){return{}},Rc=new ho;function sn(a,h,f,g){this.j=a,this.i=h,this.l=f,this.R=g||1,this.U=new Oi(this),this.I=45e3,this.H=null,this.o=!1,this.m=this.A=this.v=this.L=this.F=this.S=this.B=null,this.D=[],this.g=null,this.C=0,this.s=this.u=null,this.X=-1,this.J=!1,this.O=0,this.M=null,this.W=this.K=this.T=this.P=!1,this.h=new Yh}function Yh(){this.i=null,this.g="",this.h=!1}var Jh={},Sc={};function Pc(a,h,f){a.L=1,a.v=go(Ot(h)),a.m=f,a.P=!0,Xh(a,null)}function Xh(a,h){a.F=Date.now(),fo(a),a.A=Ot(a.v);var f=a.A,g=a.R;Array.isArray(g)||(g=[String(g)]),dd(f.i,"t",g),a.C=0,f=a.j.J,a.h=new Yh,a.g=kd(a.j,f?h:null,!a.m),0<a.O&&(a.M=new hT(m(a.Y,a,a.g),a.O)),h=a.U,f=a.g,g=a.ca;var b="readystatechange";Array.isArray(b)||(b&&(qh[0]=b.toString()),b=qh);for(var C=0;C<b.length;C++){var F=xh(f,b[C],g||h.handleEvent,!1,h.h||h);if(!F)break;h.g[F.key]=F}h=a.H?_(a.H):{},a.m?(a.u||(a.u="POST"),h["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.A,a.u,a.m,h)):(a.u="GET",a.g.ea(a.A,a.u,null,h)),Li(),pT(a.i,a.u,a.A,a.l,a.R,a.m)}sn.prototype.ca=function(a){a=a.target;const h=this.M;h&&xt(a)==3?h.j():this.Y(a)},sn.prototype.Y=function(a){try{if(a==this.g)e:{const qe=xt(this.g);var h=this.g.Ba();const Cr=this.g.Z();if(!(3>qe)&&(qe!=3||this.g&&(this.h.h||this.g.oa()||Id(this.g)))){this.J||qe!=4||h==7||(h==8||0>=Cr?Li(3):Li(2)),Cc(this);var f=this.g.Z();this.X=f;t:if(Zh(this)){var g=Id(this.g);a="";var b=g.length,C=xt(this.g)==4;if(!this.h.i){if(typeof TextDecoder>"u"){qn(this),Ui(this);var F="";break t}this.h.i=new c.TextDecoder}for(h=0;h<b;h++)this.h.h=!0,a+=this.h.i.decode(g[h],{stream:!(C&&h==b-1)});g.length=0,this.h.g+=a,this.C=0,F=this.h.g}else F=this.g.oa();if(this.o=f==200,mT(this.i,this.u,this.A,this.l,this.R,qe,f),this.o){if(this.T&&!this.K){t:{if(this.g){var ae,xe=this.g;if((ae=xe.g?xe.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!B(ae)){var te=ae;break t}}te=null}if(f=te)Rr(this.i,this.l,f,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,kc(this,f);else{this.o=!1,this.s=3,He(12),qn(this),Ui(this);break e}}if(this.P){f=!0;let gt;for(;!this.J&&this.C<F.length;)if(gt=yT(this,F),gt==Sc){qe==4&&(this.s=4,He(14),f=!1),Rr(this.i,this.l,null,"[Incomplete Response]");break}else if(gt==Jh){this.s=4,He(15),Rr(this.i,this.l,F,"[Invalid Chunk]"),f=!1;break}else Rr(this.i,this.l,gt,null),kc(this,gt);if(Zh(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),qe!=4||F.length!=0||this.h.h||(this.s=1,He(16),f=!1),this.o=this.o&&f,!f)Rr(this.i,this.l,F,"[Invalid Chunked Response]"),qn(this),Ui(this);else if(0<F.length&&!this.W){this.W=!0;var Be=this.j;Be.g==this&&Be.ba&&!Be.M&&(Be.j.info("Great, no buffering proxy detected. Bytes received: "+F.length),Lc(Be),Be.M=!0,He(11))}}else Rr(this.i,this.l,F,null),kc(this,F);qe==4&&qn(this),this.o&&!this.J&&(qe==4?Rd(this.j,this):(this.o=!1,fo(this)))}else xT(this.g),f==400&&0<F.indexOf("Unknown SID")?(this.s=3,He(12)):(this.s=0,He(13)),qn(this),Ui(this)}}}catch{}finally{}};function Zh(a){return a.g?a.u=="GET"&&a.L!=2&&a.j.Ca:!1}function yT(a,h){var f=a.C,g=h.indexOf(`
`,f);return g==-1?Sc:(f=Number(h.substring(f,g)),isNaN(f)?Jh:(g+=1,g+f>h.length?Sc:(h=h.slice(g,g+f),a.C=g+f,h)))}sn.prototype.cancel=function(){this.J=!0,qn(this)};function fo(a){a.S=Date.now()+a.I,ed(a,a.I)}function ed(a,h){if(a.B!=null)throw Error("WatchDog timer not null");a.B=Mi(m(a.ba,a),h)}function Cc(a){a.B&&(c.clearTimeout(a.B),a.B=null)}sn.prototype.ba=function(){this.B=null;const a=Date.now();0<=a-this.S?(gT(this.i,this.A),this.L!=2&&(Li(),He(17)),qn(this),this.s=2,Ui(this)):ed(this,this.S-a)};function Ui(a){a.j.G==0||a.J||Rd(a.j,a)}function qn(a){Cc(a);var h=a.M;h&&typeof h.ma=="function"&&h.ma(),a.M=null,jh(a.U),a.g&&(h=a.g,a.g=null,h.abort(),h.ma())}function kc(a,h){try{var f=a.j;if(f.G!=0&&(f.g==a||Dc(f.h,a))){if(!a.K&&Dc(f.h,a)&&f.G==3){try{var g=f.Da.g.parse(h)}catch{g=null}if(Array.isArray(g)&&g.length==3){var b=g;if(b[0]==0){e:if(!f.u){if(f.g)if(f.g.F+3e3<a.F)vo(f),To(f);else break e;xc(f),He(18)}}else f.za=b[1],0<f.za-f.T&&37500>b[2]&&f.F&&f.v==0&&!f.C&&(f.C=Mi(m(f.Za,f),6e3));if(1>=rd(f.h)&&f.ca){try{f.ca()}catch{}f.ca=void 0}}else $n(f,11)}else if((a.K||f.g==a)&&vo(f),!B(h))for(b=f.Da.g.parse(h),h=0;h<b.length;h++){let te=b[h];if(f.T=te[0],te=te[1],f.G==2)if(te[0]=="c"){f.K=te[1],f.ia=te[2];const Be=te[3];Be!=null&&(f.la=Be,f.j.info("VER="+f.la));const qe=te[4];qe!=null&&(f.Aa=qe,f.j.info("SVER="+f.Aa));const Cr=te[5];Cr!=null&&typeof Cr=="number"&&0<Cr&&(g=1.5*Cr,f.L=g,f.j.info("backChannelRequestTimeoutMs_="+g)),g=f;const gt=a.g;if(gt){const Ao=gt.g?gt.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(Ao){var C=g.h;C.g||Ao.indexOf("spdy")==-1&&Ao.indexOf("quic")==-1&&Ao.indexOf("h2")==-1||(C.j=C.l,C.g=new Set,C.h&&(Nc(C,C.h),C.h=null))}if(g.D){const Mc=gt.g?gt.g.getResponseHeader("X-HTTP-Session-Id"):null;Mc&&(g.ya=Mc,ue(g.I,g.D,Mc))}}f.G=3,f.l&&f.l.ua(),f.ba&&(f.R=Date.now()-a.F,f.j.info("Handshake RTT: "+f.R+"ms")),g=f;var F=a;if(g.qa=Cd(g,g.J?g.ia:null,g.W),F.K){id(g.h,F);var ae=F,xe=g.L;xe&&(ae.I=xe),ae.B&&(Cc(ae),fo(ae)),g.g=F}else Ad(g);0<f.i.length&&Eo(f)}else te[0]!="stop"&&te[0]!="close"||$n(f,7);else f.G==3&&(te[0]=="stop"||te[0]=="close"?te[0]=="stop"?$n(f,7):Oc(f):te[0]!="noop"&&f.l&&f.l.ta(te),f.v=0)}}Li(4)}catch{}}var IT=class{constructor(a,h){this.g=a,this.map=h}};function td(a){this.l=a||10,c.PerformanceNavigationTiming?(a=c.performance.getEntriesByType("navigation"),a=0<a.length&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(c.chrome&&c.chrome.loadTimes&&c.chrome.loadTimes()&&c.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,1<this.j&&(this.g=new Set),this.h=null,this.i=[]}function nd(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function rd(a){return a.h?1:a.g?a.g.size:0}function Dc(a,h){return a.h?a.h==h:a.g?a.g.has(h):!1}function Nc(a,h){a.g?a.g.add(h):a.h=h}function id(a,h){a.h&&a.h==h?a.h=null:a.g&&a.g.has(h)&&a.g.delete(h)}td.prototype.cancel=function(){if(this.i=sd(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function sd(a){if(a.h!=null)return a.i.concat(a.h.D);if(a.g!=null&&a.g.size!==0){let h=a.i;for(const f of a.g.values())h=h.concat(f.D);return h}return D(a.i)}function TT(a){if(a.V&&typeof a.V=="function")return a.V();if(typeof Map<"u"&&a instanceof Map||typeof Set<"u"&&a instanceof Set)return Array.from(a.values());if(typeof a=="string")return a.split("");if(u(a)){for(var h=[],f=a.length,g=0;g<f;g++)h.push(a[g]);return h}h=[],f=0;for(g in a)h[f++]=a[g];return h}function ET(a){if(a.na&&typeof a.na=="function")return a.na();if(!a.V||typeof a.V!="function"){if(typeof Map<"u"&&a instanceof Map)return Array.from(a.keys());if(!(typeof Set<"u"&&a instanceof Set)){if(u(a)||typeof a=="string"){var h=[];a=a.length;for(var f=0;f<a;f++)h.push(f);return h}h=[],f=0;for(const g in a)h[f++]=g;return h}}}function od(a,h){if(a.forEach&&typeof a.forEach=="function")a.forEach(h,void 0);else if(u(a)||typeof a=="string")Array.prototype.forEach.call(a,h,void 0);else for(var f=ET(a),g=TT(a),b=g.length,C=0;C<b;C++)h.call(void 0,g[C],f&&f[C],a)}var ad=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function vT(a,h){if(a){a=a.split("&");for(var f=0;f<a.length;f++){var g=a[f].indexOf("="),b=null;if(0<=g){var C=a[f].substring(0,g);b=a[f].substring(g+1)}else C=a[f];h(C,b?decodeURIComponent(b.replace(/\+/g," ")):"")}}}function jn(a){if(this.g=this.o=this.j="",this.s=null,this.m=this.l="",this.h=!1,a instanceof jn){this.h=a.h,po(this,a.j),this.o=a.o,this.g=a.g,mo(this,a.s),this.l=a.l;var h=a.i,f=new ji;f.i=h.i,h.g&&(f.g=new Map(h.g),f.h=h.h),cd(this,f),this.m=a.m}else a&&(h=String(a).match(ad))?(this.h=!1,po(this,h[1]||"",!0),this.o=Bi(h[2]||""),this.g=Bi(h[3]||"",!0),mo(this,h[4]),this.l=Bi(h[5]||"",!0),cd(this,h[6]||"",!0),this.m=Bi(h[7]||"")):(this.h=!1,this.i=new ji(null,this.h))}jn.prototype.toString=function(){var a=[],h=this.j;h&&a.push(qi(h,ud,!0),":");var f=this.g;return(f||h=="file")&&(a.push("//"),(h=this.o)&&a.push(qi(h,ud,!0),"@"),a.push(encodeURIComponent(String(f)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),f=this.s,f!=null&&a.push(":",String(f))),(f=this.l)&&(this.g&&f.charAt(0)!="/"&&a.push("/"),a.push(qi(f,f.charAt(0)=="/"?bT:AT,!0))),(f=this.i.toString())&&a.push("?",f),(f=this.m)&&a.push("#",qi(f,ST)),a.join("")};function Ot(a){return new jn(a)}function po(a,h,f){a.j=f?Bi(h,!0):h,a.j&&(a.j=a.j.replace(/:$/,""))}function mo(a,h){if(h){if(h=Number(h),isNaN(h)||0>h)throw Error("Bad port number "+h);a.s=h}else a.s=null}function cd(a,h,f){h instanceof ji?(a.i=h,PT(a.i,a.h)):(f||(h=qi(h,RT)),a.i=new ji(h,a.h))}function ue(a,h,f){a.i.set(h,f)}function go(a){return ue(a,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),a}function Bi(a,h){return a?h?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function qi(a,h,f){return typeof a=="string"?(a=encodeURI(a).replace(h,wT),f&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function wT(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var ud=/[#\/\?@]/g,AT=/[#\?:]/g,bT=/[#\?]/g,RT=/[#\?@]/g,ST=/#/g;function ji(a,h){this.h=this.g=null,this.i=a||null,this.j=!!h}function on(a){a.g||(a.g=new Map,a.h=0,a.i&&vT(a.i,function(h,f){a.add(decodeURIComponent(h.replace(/\+/g," ")),f)}))}n=ji.prototype,n.add=function(a,h){on(this),this.i=null,a=Sr(this,a);var f=this.g.get(a);return f||this.g.set(a,f=[]),f.push(h),this.h+=1,this};function ld(a,h){on(a),h=Sr(a,h),a.g.has(h)&&(a.i=null,a.h-=a.g.get(h).length,a.g.delete(h))}function hd(a,h){return on(a),h=Sr(a,h),a.g.has(h)}n.forEach=function(a,h){on(this),this.g.forEach(function(f,g){f.forEach(function(b){a.call(h,b,g,this)},this)},this)},n.na=function(){on(this);const a=Array.from(this.g.values()),h=Array.from(this.g.keys()),f=[];for(let g=0;g<h.length;g++){const b=a[g];for(let C=0;C<b.length;C++)f.push(h[g])}return f},n.V=function(a){on(this);let h=[];if(typeof a=="string")hd(this,a)&&(h=h.concat(this.g.get(Sr(this,a))));else{a=Array.from(this.g.values());for(let f=0;f<a.length;f++)h=h.concat(a[f])}return h},n.set=function(a,h){return on(this),this.i=null,a=Sr(this,a),hd(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[h]),this.h+=1,this},n.get=function(a,h){return a?(a=this.V(a),0<a.length?String(a[0]):h):h};function dd(a,h,f){ld(a,h),0<f.length&&(a.i=null,a.g.set(Sr(a,h),D(f)),a.h+=f.length)}n.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],h=Array.from(this.g.keys());for(var f=0;f<h.length;f++){var g=h[f];const C=encodeURIComponent(String(g)),F=this.V(g);for(g=0;g<F.length;g++){var b=C;F[g]!==""&&(b+="="+encodeURIComponent(String(F[g]))),a.push(b)}}return this.i=a.join("&")};function Sr(a,h){return h=String(h),a.j&&(h=h.toLowerCase()),h}function PT(a,h){h&&!a.j&&(on(a),a.i=null,a.g.forEach(function(f,g){var b=g.toLowerCase();g!=b&&(ld(this,g),dd(this,b,f))},a)),a.j=h}function CT(a,h){const f=new Fi;if(c.Image){const g=new Image;g.onload=T(an,f,"TestLoadImage: loaded",!0,h,g),g.onerror=T(an,f,"TestLoadImage: error",!1,h,g),g.onabort=T(an,f,"TestLoadImage: abort",!1,h,g),g.ontimeout=T(an,f,"TestLoadImage: timeout",!1,h,g),c.setTimeout(function(){g.ontimeout&&g.ontimeout()},1e4),g.src=a}else h(!1)}function kT(a,h){const f=new Fi,g=new AbortController,b=setTimeout(()=>{g.abort(),an(f,"TestPingServer: timeout",!1,h)},1e4);fetch(a,{signal:g.signal}).then(C=>{clearTimeout(b),C.ok?an(f,"TestPingServer: ok",!0,h):an(f,"TestPingServer: server error",!1,h)}).catch(()=>{clearTimeout(b),an(f,"TestPingServer: error",!1,h)})}function an(a,h,f,g,b){try{b&&(b.onload=null,b.onerror=null,b.onabort=null,b.ontimeout=null),g(f)}catch{}}function DT(){this.g=new fT}function NT(a,h,f){const g=f||"";try{od(a,function(b,C){let F=b;l(b)&&(F=vc(b)),h.push(g+C+"="+encodeURIComponent(F))})}catch(b){throw h.push(g+"type="+encodeURIComponent("_badmap")),b}}function _o(a){this.l=a.Ub||null,this.j=a.eb||!1}P(_o,wc),_o.prototype.g=function(){return new yo(this.l,this.j)},_o.prototype.i=(function(a){return function(){return a}})({});function yo(a,h){Ue.call(this),this.D=a,this.o=h,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.u=new Headers,this.h=null,this.B="GET",this.A="",this.g=!1,this.v=this.j=this.l=null}P(yo,Ue),n=yo.prototype,n.open=function(a,h){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.B=a,this.A=h,this.readyState=1,zi(this)},n.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");this.g=!0;const h={headers:this.u,method:this.B,credentials:this.m,cache:void 0};a&&(h.body=a),(this.D||c).fetch(new Request(this.A,h)).then(this.Sa.bind(this),this.ga.bind(this))},n.abort=function(){this.response=this.responseText="",this.u=new Headers,this.status=0,this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),1<=this.readyState&&this.g&&this.readyState!=4&&(this.g=!1,$i(this)),this.readyState=0},n.Sa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,zi(this)),this.g&&(this.readyState=3,zi(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if(typeof c.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.v=new TextDecoder;fd(this)}else a.text().then(this.Ra.bind(this),this.ga.bind(this))};function fd(a){a.j.read().then(a.Pa.bind(a)).catch(a.ga.bind(a))}n.Pa=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var h=a.value?a.value:new Uint8Array(0);(h=this.v.decode(h,{stream:!a.done}))&&(this.response=this.responseText+=h)}a.done?$i(this):zi(this),this.readyState==3&&fd(this)}},n.Ra=function(a){this.g&&(this.response=this.responseText=a,$i(this))},n.Qa=function(a){this.g&&(this.response=a,$i(this))},n.ga=function(){this.g&&$i(this)};function $i(a){a.readyState=4,a.l=null,a.j=null,a.v=null,zi(a)}n.setRequestHeader=function(a,h){this.u.append(a,h)},n.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},n.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],h=this.h.entries();for(var f=h.next();!f.done;)f=f.value,a.push(f[0]+": "+f[1]),f=h.next();return a.join(`\r
`)};function zi(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(yo.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function pd(a){let h="";return W(a,function(f,g){h+=g,h+=":",h+=f,h+=`\r
`}),h}function Vc(a,h,f){e:{for(g in f){var g=!1;break e}g=!0}g||(f=pd(f),typeof a=="string"?f!=null&&encodeURIComponent(String(f)):ue(a,h,f))}function Ie(a){Ue.call(this),this.headers=new Map,this.o=a||null,this.h=!1,this.v=this.g=null,this.D="",this.m=0,this.l="",this.j=this.B=this.u=this.A=!1,this.I=null,this.H="",this.J=!1}P(Ie,Ue);var VT=/^https?$/i,OT=["POST","PUT"];n=Ie.prototype,n.Ha=function(a){this.J=a},n.ea=function(a,h,f,g){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);h=h?h.toUpperCase():"GET",this.D=a,this.l="",this.m=0,this.A=!1,this.h=!0,this.g=this.o?this.o.g():Rc.g(),this.v=this.o?$h(this.o):$h(Rc),this.g.onreadystatechange=m(this.Ea,this);try{this.B=!0,this.g.open(h,String(a),!0),this.B=!1}catch(C){md(this,C);return}if(a=f||"",f=new Map(this.headers),g)if(Object.getPrototypeOf(g)===Object.prototype)for(var b in g)f.set(b,g[b]);else if(typeof g.keys=="function"&&typeof g.get=="function")for(const C of g.keys())f.set(C,g.get(C));else throw Error("Unknown input type for opt_headers: "+String(g));g=Array.from(f.keys()).find(C=>C.toLowerCase()=="content-type"),b=c.FormData&&a instanceof c.FormData,!(0<=Array.prototype.indexOf.call(OT,h,void 0))||g||b||f.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[C,F]of f)this.g.setRequestHeader(C,F);this.H&&(this.g.responseType=this.H),"withCredentials"in this.g&&this.g.withCredentials!==this.J&&(this.g.withCredentials=this.J);try{yd(this),this.u=!0,this.g.send(a),this.u=!1}catch(C){md(this,C)}};function md(a,h){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=h,a.m=5,gd(a),Io(a)}function gd(a){a.A||(a.A=!0,We(a,"complete"),We(a,"error"))}n.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.m=a||7,We(this,"complete"),We(this,"abort"),Io(this))},n.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Io(this,!0)),Ie.aa.N.call(this)},n.Ea=function(){this.s||(this.B||this.u||this.j?_d(this):this.bb())},n.bb=function(){_d(this)};function _d(a){if(a.h&&typeof o<"u"&&(!a.v[1]||xt(a)!=4||a.Z()!=2)){if(a.u&&xt(a)==4)Uh(a.Ea,0,a);else if(We(a,"readystatechange"),xt(a)==4){a.h=!1;try{const F=a.Z();e:switch(F){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var h=!0;break e;default:h=!1}var f;if(!(f=h)){var g;if(g=F===0){var b=String(a.D).match(ad)[1]||null;!b&&c.self&&c.self.location&&(b=c.self.location.protocol.slice(0,-1)),g=!VT.test(b?b.toLowerCase():"")}f=g}if(f)We(a,"complete"),We(a,"success");else{a.m=6;try{var C=2<xt(a)?a.g.statusText:""}catch{C=""}a.l=C+" ["+a.Z()+"]",gd(a)}}finally{Io(a)}}}}function Io(a,h){if(a.g){yd(a);const f=a.g,g=a.v[0]?()=>{}:null;a.g=null,a.v=null,h||We(a,"ready");try{f.onreadystatechange=g}catch{}}}function yd(a){a.I&&(c.clearTimeout(a.I),a.I=null)}n.isActive=function(){return!!this.g};function xt(a){return a.g?a.g.readyState:0}n.Z=function(){try{return 2<xt(this)?this.g.status:-1}catch{return-1}},n.oa=function(){try{return this.g?this.g.responseText:""}catch{return""}},n.Oa=function(a){if(this.g){var h=this.g.responseText;return a&&h.indexOf(a)==0&&(h=h.substring(a.length)),dT(h)}};function Id(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.H){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function xT(a){const h={};a=(a.g&&2<=xt(a)&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let g=0;g<a.length;g++){if(B(a[g]))continue;var f=w(a[g]);const b=f[0];if(f=f[1],typeof f!="string")continue;f=f.trim();const C=h[b]||[];h[b]=C,C.push(f)}E(h,function(g){return g.join(", ")})}n.Ba=function(){return this.m},n.Ka=function(){return typeof this.l=="string"?this.l:String(this.l)};function Gi(a,h,f){return f&&f.internalChannelParams&&f.internalChannelParams[a]||h}function Td(a){this.Aa=0,this.i=[],this.j=new Fi,this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null,this.Ya=this.U=0,this.Va=Gi("failFast",!1,a),this.F=this.C=this.u=this.s=this.l=null,this.X=!0,this.za=this.T=-1,this.Y=this.v=this.B=0,this.Ta=Gi("baseRetryDelayMs",5e3,a),this.cb=Gi("retryDelaySeedMs",1e4,a),this.Wa=Gi("forwardChannelMaxRetries",2,a),this.wa=Gi("forwardChannelRequestTimeoutMs",2e4,a),this.pa=a&&a.xmlHttpFactory||void 0,this.Xa=a&&a.Tb||void 0,this.Ca=a&&a.useFetchStreams||!1,this.L=void 0,this.J=a&&a.supportsCrossDomainXhr||!1,this.K="",this.h=new td(a&&a.concurrentRequestLimit),this.Da=new DT,this.P=a&&a.fastHandshake||!1,this.O=a&&a.encodeInitMessageHeaders||!1,this.P&&this.O&&(this.O=!1),this.Ua=a&&a.Rb||!1,a&&a.xa&&this.j.xa(),a&&a.forceLongPolling&&(this.X=!1),this.ba=!this.P&&this.X&&a&&a.detectBufferingProxy||!1,this.ja=void 0,a&&a.longPollingTimeout&&0<a.longPollingTimeout&&(this.ja=a.longPollingTimeout),this.ca=void 0,this.R=0,this.M=!1,this.ka=this.A=null}n=Td.prototype,n.la=8,n.G=1,n.connect=function(a,h,f,g){He(0),this.W=a,this.H=h||{},f&&g!==void 0&&(this.H.OSID=f,this.H.OAID=g),this.F=this.X,this.I=Cd(this,null,this.W),Eo(this)};function Oc(a){if(Ed(a),a.G==3){var h=a.U++,f=Ot(a.I);if(ue(f,"SID",a.K),ue(f,"RID",h),ue(f,"TYPE","terminate"),Ki(a,f),h=new sn(a,a.j,h),h.L=2,h.v=go(Ot(f)),f=!1,c.navigator&&c.navigator.sendBeacon)try{f=c.navigator.sendBeacon(h.v.toString(),"")}catch{}!f&&c.Image&&(new Image().src=h.v,f=!0),f||(h.g=kd(h.j,null),h.g.ea(h.v)),h.F=Date.now(),fo(h)}Pd(a)}function To(a){a.g&&(Lc(a),a.g.cancel(),a.g=null)}function Ed(a){To(a),a.u&&(c.clearTimeout(a.u),a.u=null),vo(a),a.h.cancel(),a.s&&(typeof a.s=="number"&&c.clearTimeout(a.s),a.s=null)}function Eo(a){if(!nd(a.h)&&!a.s){a.s=!0;var h=a.Ga;Di||Oh(),Ni||(Di(),Ni=!0),pc.add(h,a),a.B=0}}function LT(a,h){return rd(a.h)>=a.h.j-(a.s?1:0)?!1:a.s?(a.i=h.D.concat(a.i),!0):a.G==1||a.G==2||a.B>=(a.Va?0:a.Wa)?!1:(a.s=Mi(m(a.Ga,a,h),Sd(a,a.B)),a.B++,!0)}n.Ga=function(a){if(this.s)if(this.s=null,this.G==1){if(!a){this.U=Math.floor(1e5*Math.random()),a=this.U++;const b=new sn(this,this.j,a);let C=this.o;if(this.S&&(C?(C=_(C),v(C,this.S)):C=this.S),this.m!==null||this.O||(b.H=C,C=null),this.P)e:{for(var h=0,f=0;f<this.i.length;f++){t:{var g=this.i[f];if("__data__"in g.map&&(g=g.map.__data__,typeof g=="string")){g=g.length;break t}g=void 0}if(g===void 0)break;if(h+=g,4096<h){h=f;break e}if(h===4096||f===this.i.length-1){h=f+1;break e}}h=1e3}else h=1e3;h=wd(this,b,h),f=Ot(this.I),ue(f,"RID",a),ue(f,"CVER",22),this.D&&ue(f,"X-HTTP-Session-Id",this.D),Ki(this,f),C&&(this.O?h="headers="+encodeURIComponent(String(pd(C)))+"&"+h:this.m&&Vc(f,this.m,C)),Nc(this.h,b),this.Ua&&ue(f,"TYPE","init"),this.P?(ue(f,"$req",h),ue(f,"SID","null"),b.T=!0,Pc(b,f,null)):Pc(b,f,h),this.G=2}}else this.G==3&&(a?vd(this,a):this.i.length==0||nd(this.h)||vd(this))};function vd(a,h){var f;h?f=h.l:f=a.U++;const g=Ot(a.I);ue(g,"SID",a.K),ue(g,"RID",f),ue(g,"AID",a.T),Ki(a,g),a.m&&a.o&&Vc(g,a.m,a.o),f=new sn(a,a.j,f,a.B+1),a.m===null&&(f.H=a.o),h&&(a.i=h.D.concat(a.i)),h=wd(a,f,1e3),f.I=Math.round(.5*a.wa)+Math.round(.5*a.wa*Math.random()),Nc(a.h,f),Pc(f,g,h)}function Ki(a,h){a.H&&W(a.H,function(f,g){ue(h,g,f)}),a.l&&od({},function(f,g){ue(h,g,f)})}function wd(a,h,f){f=Math.min(a.i.length,f);var g=a.l?m(a.l.Na,a.l,a):null;e:{var b=a.i;let C=-1;for(;;){const F=["count="+f];C==-1?0<f?(C=b[0].g,F.push("ofs="+C)):C=0:F.push("ofs="+C);let ae=!0;for(let xe=0;xe<f;xe++){let te=b[xe].g;const Be=b[xe].map;if(te-=C,0>te)C=Math.max(0,b[xe].g-100),ae=!1;else try{NT(Be,F,"req"+te+"_")}catch{g&&g(Be)}}if(ae){g=F.join("&");break e}}}return a=a.i.splice(0,f),h.D=a,g}function Ad(a){if(!a.g&&!a.u){a.Y=1;var h=a.Fa;Di||Oh(),Ni||(Di(),Ni=!0),pc.add(h,a),a.v=0}}function xc(a){return a.g||a.u||3<=a.v?!1:(a.Y++,a.u=Mi(m(a.Fa,a),Sd(a,a.v)),a.v++,!0)}n.Fa=function(){if(this.u=null,bd(this),this.ba&&!(this.M||this.g==null||0>=this.R)){var a=2*this.R;this.j.info("BP detection timer enabled: "+a),this.A=Mi(m(this.ab,this),a)}},n.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.M=!0,He(10),To(this),bd(this))};function Lc(a){a.A!=null&&(c.clearTimeout(a.A),a.A=null)}function bd(a){a.g=new sn(a,a.j,"rpc",a.Y),a.m===null&&(a.g.H=a.o),a.g.O=0;var h=Ot(a.qa);ue(h,"RID","rpc"),ue(h,"SID",a.K),ue(h,"AID",a.T),ue(h,"CI",a.F?"0":"1"),!a.F&&a.ja&&ue(h,"TO",a.ja),ue(h,"TYPE","xmlhttp"),Ki(a,h),a.m&&a.o&&Vc(h,a.m,a.o),a.L&&(a.g.I=a.L);var f=a.g;a=a.ia,f.L=1,f.v=go(Ot(h)),f.m=null,f.P=!0,Xh(f,a)}n.Za=function(){this.C!=null&&(this.C=null,To(this),xc(this),He(19))};function vo(a){a.C!=null&&(c.clearTimeout(a.C),a.C=null)}function Rd(a,h){var f=null;if(a.g==h){vo(a),Lc(a),a.g=null;var g=2}else if(Dc(a.h,h))f=h.D,id(a.h,h),g=1;else return;if(a.G!=0){if(h.o)if(g==1){f=h.m?h.m.length:0,h=Date.now()-h.F;var b=a.B;g=uo(),We(g,new Hh(g,f)),Eo(a)}else Ad(a);else if(b=h.s,b==3||b==0&&0<h.X||!(g==1&&LT(a,h)||g==2&&xc(a)))switch(f&&0<f.length&&(h=a.h,h.i=h.i.concat(f)),b){case 1:$n(a,5);break;case 4:$n(a,10);break;case 3:$n(a,6);break;default:$n(a,2)}}}function Sd(a,h){let f=a.Ta+Math.floor(Math.random()*a.cb);return a.isActive()||(f*=2),f*h}function $n(a,h){if(a.j.info("Error code "+h),h==2){var f=m(a.fb,a),g=a.Xa;const b=!g;g=new jn(g||"//www.google.com/images/cleardot.gif"),c.location&&c.location.protocol=="http"||po(g,"https"),go(g),b?CT(g.toString(),f):kT(g.toString(),f)}else He(2);a.G=0,a.l&&a.l.sa(h),Pd(a),Ed(a)}n.fb=function(a){a?(this.j.info("Successfully pinged google.com"),He(2)):(this.j.info("Failed to ping google.com"),He(1))};function Pd(a){if(a.G=0,a.ka=[],a.l){const h=sd(a.h);(h.length!=0||a.i.length!=0)&&(k(a.ka,h),k(a.ka,a.i),a.h.i.length=0,D(a.i),a.i.length=0),a.l.ra()}}function Cd(a,h,f){var g=f instanceof jn?Ot(f):new jn(f);if(g.g!="")h&&(g.g=h+"."+g.g),mo(g,g.s);else{var b=c.location;g=b.protocol,h=h?h+"."+b.hostname:b.hostname,b=+b.port;var C=new jn(null);g&&po(C,g),h&&(C.g=h),b&&mo(C,b),f&&(C.l=f),g=C}return f=a.D,h=a.ya,f&&h&&ue(g,f,h),ue(g,"VER",a.la),Ki(a,g),g}function kd(a,h,f){if(h&&!a.J)throw Error("Can't create secondary domain capable XhrIo object.");return h=a.Ca&&!a.pa?new Ie(new _o({eb:f})):new Ie(a.pa),h.Ha(a.J),h}n.isActive=function(){return!!this.l&&this.l.isActive(this)};function Dd(){}n=Dd.prototype,n.ua=function(){},n.ta=function(){},n.sa=function(){},n.ra=function(){},n.isActive=function(){return!0},n.Na=function(){};function wo(){}wo.prototype.g=function(a,h){return new ot(a,h)};function ot(a,h){Ue.call(this),this.g=new Td(h),this.l=a,this.h=h&&h.messageUrlParams||null,a=h&&h.messageHeaders||null,h&&h.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=h&&h.initMessageHeaders||null,h&&h.messageContentType&&(a?a["X-WebChannel-Content-Type"]=h.messageContentType:a={"X-WebChannel-Content-Type":h.messageContentType}),h&&h.va&&(a?a["X-WebChannel-Client-Profile"]=h.va:a={"X-WebChannel-Client-Profile":h.va}),this.g.S=a,(a=h&&h.Sb)&&!B(a)&&(this.g.m=a),this.v=h&&h.supportsCrossDomainXhr||!1,this.u=h&&h.sendRawJson||!1,(h=h&&h.httpSessionIdParam)&&!B(h)&&(this.g.D=h,a=this.h,a!==null&&h in a&&(a=this.h,h in a&&delete a[h])),this.j=new Pr(this)}P(ot,Ue),ot.prototype.m=function(){this.g.l=this.j,this.v&&(this.g.J=!0),this.g.connect(this.l,this.h||void 0)},ot.prototype.close=function(){Oc(this.g)},ot.prototype.o=function(a){var h=this.g;if(typeof a=="string"){var f={};f.__data__=a,a=f}else this.u&&(f={},f.__data__=vc(a),a=f);h.i.push(new IT(h.Ya++,a)),h.G==3&&Eo(h)},ot.prototype.N=function(){this.g.l=null,delete this.j,Oc(this.g),delete this.g,ot.aa.N.call(this)};function Nd(a){Ac.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var h=a.__sm__;if(h){e:{for(const f in h){a=f;break e}a=void 0}(this.i=a)&&(a=this.i,h=h!==null&&a in h?h[a]:void 0),this.data=h}else this.data=a}P(Nd,Ac);function Vd(){bc.call(this),this.status=1}P(Vd,bc);function Pr(a){this.g=a}P(Pr,Dd),Pr.prototype.ua=function(){We(this.g,"a")},Pr.prototype.ta=function(a){We(this.g,new Nd(a))},Pr.prototype.sa=function(a){We(this.g,new Vd)},Pr.prototype.ra=function(){We(this.g,"b")},wo.prototype.createWebChannel=wo.prototype.g,ot.prototype.send=ot.prototype.o,ot.prototype.open=ot.prototype.m,ot.prototype.close=ot.prototype.close,Rg=function(){return new wo},bg=function(){return uo()},Ag=Bn,gu={mb:0,pb:1,qb:2,Jb:3,Ob:4,Lb:5,Mb:6,Kb:7,Ib:8,Nb:9,PROXY:10,NOPROXY:11,Gb:12,Cb:13,Db:14,Bb:15,Eb:16,Fb:17,ib:18,hb:19,jb:20},lo.NO_ERROR=0,lo.TIMEOUT=8,lo.HTTP_ERROR=6,qo=lo,Qh.COMPLETE="complete",wg=Qh,zh.EventType=xi,xi.OPEN="a",xi.CLOSE="b",xi.ERROR="c",xi.MESSAGE="d",Ue.prototype.listen=Ue.prototype.K,rs=zh,Ie.prototype.listenOnce=Ie.prototype.L,Ie.prototype.getLastError=Ie.prototype.Ka,Ie.prototype.getLastErrorCode=Ie.prototype.Ba,Ie.prototype.getStatus=Ie.prototype.Z,Ie.prototype.getResponseJson=Ie.prototype.Oa,Ie.prototype.getResponseText=Ie.prototype.oa,Ie.prototype.send=Ie.prototype.ea,Ie.prototype.setWithCredentials=Ie.prototype.Ha,vg=Ie}).apply(typeof So<"u"?So:typeof self<"u"?self:typeof window<"u"?window:{});const mf="@firebase/firestore",gf="4.8.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ne{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}Ne.UNAUTHENTICATED=new Ne(null),Ne.GOOGLE_CREDENTIALS=new Ne("google-credentials-uid"),Ne.FIRST_PARTY=new Ne("first-party-uid"),Ne.MOCK_USER=new Ne("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let yi="11.10.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wn=new Sa("@firebase/firestore");function Lr(){return wn.logLevel}function Yb(n){wn.setLogLevel(n)}function V(n,...e){if(wn.logLevel<=X.DEBUG){const t=e.map(gl);wn.debug(`Firestore (${yi}): ${n}`,...t)}}function we(n,...e){if(wn.logLevel<=X.ERROR){const t=e.map(gl);wn.error(`Firestore (${yi}): ${n}`,...t)}}function Ke(n,...e){if(wn.logLevel<=X.WARN){const t=e.map(gl);wn.warn(`Firestore (${yi}): ${n}`,...t)}}function gl(n){if(typeof n=="string")return n;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/return(function(t){return JSON.stringify(t)})(n)}catch{return n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function q(n,e,t){let r="Unexpected state";typeof e=="string"?r=e:t=e,Sg(n,r,t)}function Sg(n,e,t){let r=`FIRESTORE (${yi}) INTERNAL ASSERTION FAILED: ${e} (ID: ${n.toString(16)})`;if(t!==void 0)try{r+=" CONTEXT: "+JSON.stringify(t)}catch{r+=" CONTEXT: "+t}throw we(r),new Error(r)}function $(n,e,t,r){let i="Unexpected state";typeof t=="string"?i=t:r=t,n||Sg(e,i,r)}function Jb(n,e){n||q(57014,e)}function L(n,e){return n}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const R={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class N extends mt{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oe{constructor(){this.promise=new Promise(((e,t)=>{this.resolve=e,this.reject=t}))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pg{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class Cg{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable((()=>t(Ne.UNAUTHENTICATED)))}shutdown(){}}class Xb{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable((()=>t(this.token.user)))}shutdown(){this.changeListener=null}}class Zb{constructor(e){this.t=e,this.currentUser=Ne.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){$(this.o===void 0,42304);let r=this.i;const i=u=>this.i!==r?(r=this.i,t(u)):Promise.resolve();let s=new Oe;this.o=()=>{this.i++,this.currentUser=this.u(),s.resolve(),s=new Oe,e.enqueueRetryable((()=>i(this.currentUser)))};const o=()=>{const u=s;e.enqueueRetryable((async()=>{await u.promise,await i(this.currentUser)}))},c=u=>{V("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=u,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit((u=>c(u))),setTimeout((()=>{if(!this.auth){const u=this.t.getImmediate({optional:!0});u?c(u):(V("FirebaseAuthCredentialsProvider","Auth not yet detected"),s.resolve(),s=new Oe)}}),0),o()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then((r=>this.i!==e?(V("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?($(typeof r.accessToken=="string",31837,{l:r}),new Pg(r.accessToken,this.currentUser)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return $(e===null||typeof e=="string",2055,{h:e}),new Ne(e)}}class eR{constructor(e,t,r){this.P=e,this.T=t,this.I=r,this.type="FirstParty",this.user=Ne.FIRST_PARTY,this.A=new Map}R(){return this.I?this.I():null}get headers(){this.A.set("X-Goog-AuthUser",this.P);const e=this.R();return e&&this.A.set("Authorization",e),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A}}class tR{constructor(e,t,r){this.P=e,this.T=t,this.I=r}getToken(){return Promise.resolve(new eR(this.P,this.T,this.I))}start(e,t){e.enqueueRetryable((()=>t(Ne.FIRST_PARTY)))}shutdown(){}invalidateToken(){}}class _u{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class nR{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,me(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,t){$(this.o===void 0,3512);const r=s=>{s.error!=null&&V("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${s.error.message}`);const o=s.token!==this.m;return this.m=s.token,V("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?t(s.token):Promise.resolve()};this.o=s=>{e.enqueueRetryable((()=>r(s)))};const i=s=>{V("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=s,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit((s=>i(s))),setTimeout((()=>{if(!this.appCheck){const s=this.V.getImmediate({optional:!0});s?i(s):V("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}}),0)}getToken(){if(this.p)return Promise.resolve(new _u(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then((t=>t?($(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new _u(t.token)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}class rR{getToken(){return Promise.resolve(new _u(""))}invalidateToken(){}start(e,t){}shutdown(){}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function iR(n){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(n);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let r=0;r<n;r++)t[r]=Math.floor(256*Math.random());return t}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _l(){return new TextEncoder}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ua{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let r="";for(;r.length<20;){const i=iR(40);for(let s=0;s<i.length;++s)r.length<20&&i[s]<t&&(r+=e.charAt(i[s]%62))}return r}}function K(n,e){return n<e?-1:n>e?1:0}function yu(n,e){let t=0;for(;t<n.length&&t<e.length;){const r=n.codePointAt(t),i=e.codePointAt(t);if(r!==i){if(r<128&&i<128)return K(r,i);{const s=_l(),o=sR(s.encode(_f(n,t)),s.encode(_f(e,t)));return o!==0?o:K(r,i)}}t+=r>65535?2:1}return K(n.length,e.length)}function _f(n,e){return n.codePointAt(e)>65535?n.substring(e,e+2):n.substring(e,e+1)}function sR(n,e){for(let t=0;t<n.length&&t<e.length;++t)if(n[t]!==e[t])return K(n[t],e[t]);return K(n.length,e.length)}function Kr(n,e,t){return n.length===e.length&&n.every(((r,i)=>t(r,e[i])))}function kg(n){return n+"\0"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Iu="__name__";class vt{constructor(e,t,r){t===void 0?t=0:t>e.length&&q(637,{offset:t,range:e.length}),r===void 0?r=e.length-t:r>e.length-t&&q(1746,{length:r,range:e.length-t}),this.segments=e,this.offset=t,this.len=r}get length(){return this.len}isEqual(e){return vt.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof vt?e.forEach((r=>{t.push(r)})):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,r=this.limit();t<r;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const r=Math.min(e.length,t.length);for(let i=0;i<r;i++){const s=vt.compareSegments(e.get(i),t.get(i));if(s!==0)return s}return K(e.length,t.length)}static compareSegments(e,t){const r=vt.isNumericId(e),i=vt.isNumericId(t);return r&&!i?-1:!r&&i?1:r&&i?vt.extractNumericId(e).compare(vt.extractNumericId(t)):yu(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return En.fromString(e.substring(4,e.length-2))}}class Q extends vt{construct(e,t,r){return new Q(e,t,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const r of e){if(r.indexOf("//")>=0)throw new N(R.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);t.push(...r.split("/").filter((i=>i.length>0)))}return new Q(t)}static emptyPath(){return new Q([])}}const oR=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class he extends vt{construct(e,t,r){return new he(e,t,r)}static isValidIdentifier(e){return oR.test(e)}canonicalString(){return this.toArray().map((e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),he.isValidIdentifier(e)||(e="`"+e+"`"),e))).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===Iu}static keyField(){return new he([Iu])}static fromServerFormat(e){const t=[];let r="",i=0;const s=()=>{if(r.length===0)throw new N(R.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(r),r=""};let o=!1;for(;i<e.length;){const c=e[i];if(c==="\\"){if(i+1===e.length)throw new N(R.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const u=e[i+1];if(u!=="\\"&&u!=="."&&u!=="`")throw new N(R.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=u,i+=2}else c==="`"?(o=!o,i++):c!=="."||o?(r+=c,i++):(s(),i++)}if(s(),o)throw new N(R.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new he(t)}static emptyPath(){return new he([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class x{constructor(e){this.path=e}static fromPath(e){return new x(Q.fromString(e))}static fromName(e){return new x(Q.fromString(e).popFirst(5))}static empty(){return new x(Q.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&Q.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return Q.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new x(new Q(e.slice()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yl(n,e,t){if(!t)throw new N(R.INVALID_ARGUMENT,`Function ${n}() cannot be called with an empty ${e}.`)}function Dg(n,e,t,r){if(e===!0&&r===!0)throw new N(R.INVALID_ARGUMENT,`${n} and ${t} cannot be used together.`)}function yf(n){if(!x.isDocumentKey(n))throw new N(R.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${n} has ${n.length}.`)}function If(n){if(x.isDocumentKey(n))throw new N(R.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${n} has ${n.length}.`)}function Ng(n){return typeof n=="object"&&n!==null&&(Object.getPrototypeOf(n)===Object.prototype||Object.getPrototypeOf(n)===null)}function Ba(n){if(n===void 0)return"undefined";if(n===null)return"null";if(typeof n=="string")return n.length>20&&(n=`${n.substring(0,20)}...`),JSON.stringify(n);if(typeof n=="number"||typeof n=="boolean")return""+n;if(typeof n=="object"){if(n instanceof Array)return"an array";{const e=(function(r){return r.constructor?r.constructor.name:null})(n);return e?`a custom ${e} object`:"an object"}}return typeof n=="function"?"a function":q(12329,{type:typeof n})}function Y(n,e){if("_delegate"in n&&(n=n._delegate),!(n instanceof e)){if(e.name===n.constructor.name)throw new N(R.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=Ba(n);throw new N(R.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return n}function Vg(n,e){if(e<=0)throw new N(R.INVALID_ARGUMENT,`Function ${n}() requires a positive number, but it was: ${e}.`)}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Se(n,e){const t={typeString:n};return e&&(t.value=e),t}function Er(n,e){if(!Ng(n))throw new N(R.INVALID_ARGUMENT,"JSON must be an object");let t;for(const r in e)if(e[r]){const i=e[r].typeString,s="value"in e[r]?{value:e[r].value}:void 0;if(!(r in n)){t=`JSON missing required field: '${r}'`;break}const o=n[r];if(i&&typeof o!==i){t=`JSON field '${r}' must be a ${i}.`;break}if(s!==void 0&&o!==s.value){t=`Expected '${r}' field to equal '${s.value}'`;break}}if(t)throw new N(R.INVALID_ARGUMENT,t);return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Tf=-62135596800,Ef=1e6;class ne{static now(){return ne.fromMillis(Date.now())}static fromDate(e){return ne.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),r=Math.floor((e-1e3*t)*Ef);return new ne(t,r)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new N(R.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new N(R.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<Tf)throw new N(R.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new N(R.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/Ef}_compareTo(e){return this.seconds===e.seconds?K(this.nanoseconds,e.nanoseconds):K(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:ne._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(Er(e,ne._jsonSchema))return new ne(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-Tf;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}ne._jsonSchemaVersion="firestore/timestamp/1.0",ne._jsonSchema={type:Se("string",ne._jsonSchemaVersion),seconds:Se("number"),nanoseconds:Se("number")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class z{static fromTimestamp(e){return new z(e)}static min(){return new z(new ne(0,0))}static max(){return new z(new ne(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Wr=-1;class Hr{constructor(e,t,r,i){this.indexId=e,this.collectionGroup=t,this.fields=r,this.indexState=i}}function Tu(n){return n.fields.find((e=>e.kind===2))}function Kn(n){return n.fields.filter((e=>e.kind!==2))}function aR(n,e){let t=K(n.collectionGroup,e.collectionGroup);if(t!==0)return t;for(let r=0;r<Math.min(n.fields.length,e.fields.length);++r)if(t=cR(n.fields[r],e.fields[r]),t!==0)return t;return K(n.fields.length,e.fields.length)}Hr.UNKNOWN_ID=-1;class nr{constructor(e,t){this.fieldPath=e,this.kind=t}}function cR(n,e){const t=he.comparator(n.fieldPath,e.fieldPath);return t!==0?t:K(n.kind,e.kind)}class Qr{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new Qr(0,lt.min())}}function Og(n,e){const t=n.toTimestamp().seconds,r=n.toTimestamp().nanoseconds+1,i=z.fromTimestamp(r===1e9?new ne(t+1,0):new ne(t,r));return new lt(i,x.empty(),e)}function xg(n){return new lt(n.readTime,n.key,Wr)}class lt{constructor(e,t,r){this.readTime=e,this.documentKey=t,this.largestBatchId=r}static min(){return new lt(z.min(),x.empty(),Wr)}static max(){return new lt(z.max(),x.empty(),Wr)}}function Il(n,e){let t=n.readTime.compareTo(e.readTime);return t!==0?t:(t=x.comparator(n.documentKey,e.documentKey),t!==0?t:K(n.largestBatchId,e.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Lg="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Mg{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach((e=>e()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Nn(n){if(n.code!==R.FAILED_PRECONDITION||n.message!==Lg)throw n;V("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class A{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e((t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)}),(t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)}))}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&q(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new A(((r,i)=>{this.nextCallback=s=>{this.wrapSuccess(e,s).next(r,i)},this.catchCallback=s=>{this.wrapFailure(t,s).next(r,i)}}))}toPromise(){return new Promise(((e,t)=>{this.next(e,t)}))}wrapUserFunction(e){try{const t=e();return t instanceof A?t:A.resolve(t)}catch(t){return A.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction((()=>e(t))):A.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction((()=>e(t))):A.reject(t)}static resolve(e){return new A(((t,r)=>{t(e)}))}static reject(e){return new A(((t,r)=>{r(e)}))}static waitFor(e){return new A(((t,r)=>{let i=0,s=0,o=!1;e.forEach((c=>{++i,c.next((()=>{++s,o&&s===i&&t()}),(u=>r(u)))})),o=!0,s===i&&t()}))}static or(e){let t=A.resolve(!1);for(const r of e)t=t.next((i=>i?A.resolve(i):r()));return t}static forEach(e,t){const r=[];return e.forEach(((i,s)=>{r.push(t.call(this,i,s))})),this.waitFor(r)}static mapArray(e,t){return new A(((r,i)=>{const s=e.length,o=new Array(s);let c=0;for(let u=0;u<s;u++){const l=u;t(e[l]).next((d=>{o[l]=d,++c,c===s&&r(o)}),(d=>i(d)))}}))}static doWhile(e,t){return new A(((r,i)=>{const s=()=>{e()===!0?t().next((()=>{s()}),i):r()};s()}))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const at="SimpleDb";class qa{static open(e,t,r,i){try{return new qa(t,e.transaction(i,r))}catch(s){throw new ds(t,s)}}constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.S=new Oe,this.transaction.oncomplete=()=>{this.S.resolve()},this.transaction.onabort=()=>{t.error?this.S.reject(new ds(e,t.error)):this.S.resolve()},this.transaction.onerror=r=>{const i=Tl(r.target.error);this.S.reject(new ds(e,i))}}get D(){return this.S.promise}abort(e){e&&this.S.reject(e),this.aborted||(V(at,"Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}v(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new lR(t)}}class Pt{static delete(e){return V(at,"Removing database:",e),Hn(tm().indexedDB.deleteDatabase(e)).toPromise()}static C(){if(!Ra())return!1;if(Pt.F())return!0;const e=Pe(),t=Pt.M(e),r=0<t&&t<10,i=Fg(e),s=0<i&&i<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||r||s)}static F(){var e;return typeof process<"u"&&((e=process.__PRIVATE_env)===null||e===void 0?void 0:e.O)==="YES"}static N(e,t){return e.store(t)}static M(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),r=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(r)}constructor(e,t,r){this.name=e,this.version=t,this.B=r,this.L=null,Pt.M(Pe())===12.2&&we("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async k(e){return this.db||(V(at,"Opening database:",this.name),this.db=await new Promise(((t,r)=>{const i=indexedDB.open(this.name,this.version);i.onsuccess=s=>{const o=s.target.result;t(o)},i.onblocked=()=>{r(new ds(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},i.onerror=s=>{const o=s.target.error;o.name==="VersionError"?r(new N(R.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?r(new N(R.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):r(new ds(e,o))},i.onupgradeneeded=s=>{V(at,'Database "'+this.name+'" requires upgrade from version:',s.oldVersion);const o=s.target.result;if(this.L!==null&&this.L!==s.oldVersion)throw new Error(`refusing to open IndexedDB database due to potential corruption of the IndexedDB database data; this corruption could be caused by clicking the "clear site data" button in a web browser; try reloading the web page to re-initialize the IndexedDB database: lastClosedDbVersion=${this.L}, event.oldVersion=${s.oldVersion}, event.newVersion=${s.newVersion}, db.version=${o.version}`);this.B.q(o,i.transaction,s.oldVersion,this.version).next((()=>{V(at,"Database upgrade to version "+this.version+" complete")}))}})),this.db.addEventListener("close",(t=>{const r=t.target;this.L=r.version}),{passive:!0})),this.db.addEventListener("versionchange",(t=>{var r;t.newVersion===null&&(Ke('Received "versionchange" event with newVersion===null; notifying the registered DatabaseDeletedListener, if any'),(r=this.databaseDeletedListener)===null||r===void 0||r.call(this))}),{passive:!0}),this.db}setDatabaseDeletedListener(e){if(this.databaseDeletedListener)throw new Error("setDatabaseDeletedListener() may only be called once, and it has already been called");this.databaseDeletedListener=e}async runTransaction(e,t,r,i){const s=t==="readonly";let o=0;for(;;){++o;try{this.db=await this.k(e);const c=qa.open(this.db,e,s?"readonly":"readwrite",r),u=i(c).next((l=>(c.v(),l))).catch((l=>(c.abort(l),A.reject(l)))).toPromise();return u.catch((()=>{})),await c.D,u}catch(c){const u=c,l=u.name!=="FirebaseError"&&o<3;if(V(at,"Transaction failed with error:",u.message,"Retrying:",l),this.close(),!l)return Promise.reject(u)}}}close(){this.db&&this.db.close(),this.db=void 0}}function Fg(n){const e=n.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class uR{constructor(e){this.$=e,this.U=!1,this.K=null}get isDone(){return this.U}get W(){return this.K}set cursor(e){this.$=e}done(){this.U=!0}G(e){this.K=e}delete(){return Hn(this.$.delete())}}class ds extends N{constructor(e,t){super(R.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function Vn(n){return n.name==="IndexedDbTransactionError"}class lR{constructor(e){this.store=e}put(e,t){let r;return t!==void 0?(V(at,"PUT",this.store.name,e,t),r=this.store.put(t,e)):(V(at,"PUT",this.store.name,"<auto-key>",e),r=this.store.put(e)),Hn(r)}add(e){return V(at,"ADD",this.store.name,e,e),Hn(this.store.add(e))}get(e){return Hn(this.store.get(e)).next((t=>(t===void 0&&(t=null),V(at,"GET",this.store.name,e,t),t)))}delete(e){return V(at,"DELETE",this.store.name,e),Hn(this.store.delete(e))}count(){return V(at,"COUNT",this.store.name),Hn(this.store.count())}j(e,t){const r=this.options(e,t),i=r.index?this.store.index(r.index):this.store;if(typeof i.getAll=="function"){const s=i.getAll(r.range);return new A(((o,c)=>{s.onerror=u=>{c(u.target.error)},s.onsuccess=u=>{o(u.target.result)}}))}{const s=this.cursor(r),o=[];return this.J(s,((c,u)=>{o.push(u)})).next((()=>o))}}H(e,t){const r=this.store.getAll(e,t===null?void 0:t);return new A(((i,s)=>{r.onerror=o=>{s(o.target.error)},r.onsuccess=o=>{i(o.target.result)}}))}Y(e,t){V(at,"DELETE ALL",this.store.name);const r=this.options(e,t);r.Z=!1;const i=this.cursor(r);return this.J(i,((s,o,c)=>c.delete()))}X(e,t){let r;t?r=e:(r={},t=e);const i=this.cursor(r);return this.J(i,t)}ee(e){const t=this.cursor({});return new A(((r,i)=>{t.onerror=s=>{const o=Tl(s.target.error);i(o)},t.onsuccess=s=>{const o=s.target.result;o?e(o.primaryKey,o.value).next((c=>{c?o.continue():r()})):r()}}))}J(e,t){const r=[];return new A(((i,s)=>{e.onerror=o=>{s(o.target.error)},e.onsuccess=o=>{const c=o.target.result;if(!c)return void i();const u=new uR(c),l=t(c.primaryKey,c.value,u);if(l instanceof A){const d=l.catch((p=>(u.done(),A.reject(p))));r.push(d)}u.isDone?i():u.W===null?c.continue():c.continue(u.W)}})).next((()=>A.waitFor(r)))}options(e,t){let r;return e!==void 0&&(typeof e=="string"?r=e:t=e),{index:r,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const r=this.store.index(e.index);return e.Z?r.openKeyCursor(e.range,t):r.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function Hn(n){return new A(((e,t)=>{n.onsuccess=r=>{const i=r.target.result;e(i)},n.onerror=r=>{const i=Tl(r.target.error);t(i)}}))}let vf=!1;function Tl(n){const e=Pt.M(Pe());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(n.message.indexOf(t)>=0){const r=new N("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return vf||(vf=!0,setTimeout((()=>{throw r}),0)),r}}return n}const fs="IndexBackfiller";class hR{constructor(e,t){this.asyncQueue=e,this.te=t,this.task=null}start(){this.ne(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}ne(e){V(fs,`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,(async()=>{this.task=null;try{const t=await this.te.re();V(fs,`Documents written: ${t}`)}catch(t){Vn(t)?V(fs,"Ignoring IndexedDB error during index backfill: ",t):await Nn(t)}await this.ne(6e4)}))}}class dR{constructor(e,t){this.localStore=e,this.persistence=t}async re(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",(t=>this.ie(t,e)))}ie(e,t){const r=new Set;let i=t,s=!0;return A.doWhile((()=>s===!0&&i>0),(()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next((o=>{if(o!==null&&!r.has(o))return V(fs,`Processing collection: ${o}`),this.se(e,o,i).next((c=>{i-=c,r.add(o)}));s=!1})))).next((()=>t-i))}se(e,t,r){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next((i=>this.localStore.localDocuments.getNextDocuments(e,t,i,r).next((s=>{const o=s.changes;return this.localStore.indexManager.updateIndexEntries(e,o).next((()=>this.oe(i,s))).next((c=>(V(fs,`Updating offset: ${c}`),this.localStore.indexManager.updateCollectionGroup(e,t,c)))).next((()=>o.size))}))))}oe(e,t){let r=e;return t.changes.forEach(((i,s)=>{const o=xg(s);Il(o,r)>0&&(r=o)})),new lt(r.readTime,r.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xe{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=r=>this._e(r),this.ae=r=>t.writeSequenceNumber(r))}_e(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ae&&this.ae(e),e}}Xe.ue=-1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vn=-1;function Gs(n){return n==null}function Ps(n){return n===0&&1/n==-1/0}function Ug(n){return typeof n=="number"&&Number.isInteger(n)&&!Ps(n)&&n<=Number.MAX_SAFE_INTEGER&&n>=Number.MIN_SAFE_INTEGER}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const oa="";function ze(n){let e="";for(let t=0;t<n.length;t++)e.length>0&&(e=wf(e)),e=fR(n.get(t),e);return wf(e)}function fR(n,e){let t=e;const r=n.length;for(let i=0;i<r;i++){const s=n.charAt(i);switch(s){case"\0":t+="";break;case oa:t+="";break;default:t+=s}}return t}function wf(n){return n+oa+""}function bt(n){const e=n.length;if($(e>=2,64408,{path:n}),e===2)return $(n.charAt(0)===oa&&n.charAt(1)==="",56145,{path:n}),Q.emptyPath();const t=e-2,r=[];let i="";for(let s=0;s<e;){const o=n.indexOf(oa,s);switch((o<0||o>t)&&q(50515,{path:n}),n.charAt(o+1)){case"":const c=n.substring(s,o);let u;i.length===0?u=c:(i+=c,u=i,i=""),r.push(u);break;case"":i+=n.substring(s,o),i+="\0";break;case"":i+=n.substring(s,o+1);break;default:q(61167,{path:n})}s=o+2}return new Q(r)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Wn="remoteDocuments",Ks="owner",kr="owner",Cs="mutationQueues",pR="userId",_t="mutations",Af="batchId",Zn="userMutationsIndex",bf=["userId","batchId"];/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jo(n,e){return[n,ze(e)]}function Bg(n,e,t){return[n,ze(e),t]}const mR={},Yr="documentMutations",aa="remoteDocumentsV14",gR=["prefixPath","collectionGroup","readTime","documentId"],$o="documentKeyIndex",_R=["prefixPath","collectionGroup","documentId"],qg="collectionGroupIndex",yR=["collectionGroup","readTime","prefixPath","documentId"],ks="remoteDocumentGlobal",Eu="remoteDocumentGlobalKey",Jr="targets",jg="queryTargetsIndex",IR=["canonicalId","targetId"],Xr="targetDocuments",TR=["targetId","path"],El="documentTargetsIndex",ER=["path","targetId"],ca="targetGlobalKey",rr="targetGlobal",Ds="collectionParents",vR=["collectionId","parent"],Zr="clientMetadata",wR="clientId",ja="bundles",AR="bundleId",$a="namedQueries",bR="name",vl="indexConfiguration",RR="indexId",vu="collectionGroupIndex",SR="collectionGroup",ps="indexState",PR=["indexId","uid"],$g="sequenceNumberIndex",CR=["uid","sequenceNumber"],ms="indexEntries",kR=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],zg="documentKeyIndex",DR=["indexId","uid","orderedDocumentKey"],za="documentOverlays",NR=["userId","collectionPath","documentId"],wu="collectionPathOverlayIndex",VR=["userId","collectionPath","largestBatchId"],Gg="collectionGroupOverlayIndex",OR=["userId","collectionGroup","largestBatchId"],wl="globals",xR="name",Kg=[Cs,_t,Yr,Wn,Jr,Ks,rr,Xr,Zr,ks,Ds,ja,$a],LR=[...Kg,za],Wg=[Cs,_t,Yr,aa,Jr,Ks,rr,Xr,Zr,ks,Ds,ja,$a,za],Hg=Wg,Al=[...Hg,vl,ps,ms],MR=Al,Qg=[...Al,wl],FR=Qg;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Au extends Mg{constructor(e,t){super(),this.ce=e,this.currentSequenceNumber=t}}function ke(n,e){const t=L(n);return Pt.N(t.ce,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rf(n){let e=0;for(const t in n)Object.prototype.hasOwnProperty.call(n,t)&&e++;return e}function On(n,e){for(const t in n)Object.prototype.hasOwnProperty.call(n,t)&&e(t,n[t])}function Yg(n,e){const t=[];for(const r in n)Object.prototype.hasOwnProperty.call(n,r)&&t.push(e(n[r],r,n));return t}function Jg(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ce{constructor(e,t){this.comparator=e,this.root=t||Le.EMPTY}insert(e,t){return new ce(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,Le.BLACK,null,null))}remove(e){return new ce(this.comparator,this.root.remove(e,this.comparator).copy(null,null,Le.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const r=this.comparator(e,t.key);if(r===0)return t.value;r<0?t=t.left:r>0&&(t=t.right)}return null}indexOf(e){let t=0,r=this.root;for(;!r.isEmpty();){const i=this.comparator(e,r.key);if(i===0)return t+r.left.size;i<0?r=r.left:(t+=r.left.size+1,r=r.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal(((t,r)=>(e(t,r),!1)))}toString(){const e=[];return this.inorderTraversal(((t,r)=>(e.push(`${t}:${r}`),!1))),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new Po(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new Po(this.root,e,this.comparator,!1)}getReverseIterator(){return new Po(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new Po(this.root,e,this.comparator,!0)}}class Po{constructor(e,t,r,i){this.isReverse=i,this.nodeStack=[];let s=1;for(;!e.isEmpty();)if(s=t?r(e.key,t):1,t&&i&&(s*=-1),s<0)e=this.isReverse?e.left:e.right;else{if(s===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class Le{constructor(e,t,r,i,s){this.key=e,this.value=t,this.color=r??Le.RED,this.left=i??Le.EMPTY,this.right=s??Le.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,r,i,s){return new Le(e??this.key,t??this.value,r??this.color,i??this.left,s??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,r){let i=this;const s=r(e,i.key);return i=s<0?i.copy(null,null,null,i.left.insert(e,t,r),null):s===0?i.copy(null,t,null,null,null):i.copy(null,null,null,null,i.right.insert(e,t,r)),i.fixUp()}removeMin(){if(this.left.isEmpty())return Le.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let r,i=this;if(t(e,i.key)<0)i.left.isEmpty()||i.left.isRed()||i.left.left.isRed()||(i=i.moveRedLeft()),i=i.copy(null,null,null,i.left.remove(e,t),null);else{if(i.left.isRed()&&(i=i.rotateRight()),i.right.isEmpty()||i.right.isRed()||i.right.left.isRed()||(i=i.moveRedRight()),t(e,i.key)===0){if(i.right.isEmpty())return Le.EMPTY;r=i.right.min(),i=i.copy(r.key,r.value,null,null,i.right.removeMin())}i=i.copy(null,null,null,null,i.right.remove(e,t))}return i.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,Le.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,Le.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw q(43730,{key:this.key,value:this.value});if(this.right.isRed())throw q(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw q(27949);return e+(this.isRed()?0:1)}}Le.EMPTY=null,Le.RED=!0,Le.BLACK=!1;Le.EMPTY=new class{constructor(){this.size=0}get key(){throw q(57766)}get value(){throw q(16141)}get color(){throw q(16727)}get left(){throw q(29726)}get right(){throw q(36894)}copy(e,t,r,i,s){return this}insert(e,t,r){return new Le(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class se{constructor(e){this.comparator=e,this.data=new ce(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal(((t,r)=>(e(t),!1)))}forEachInRange(e,t){const r=this.data.getIteratorFrom(e[0]);for(;r.hasNext();){const i=r.getNext();if(this.comparator(i.key,e[1])>=0)return;t(i.key)}}forEachWhile(e,t){let r;for(r=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();r.hasNext();)if(!e(r.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new Sf(this.data.getIterator())}getIteratorFrom(e){return new Sf(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach((r=>{t=t.add(r)})),t}isEqual(e){if(!(e instanceof se)||this.size!==e.size)return!1;const t=this.data.getIterator(),r=e.data.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=r.getNext().key;if(this.comparator(i,s)!==0)return!1}return!0}toArray(){const e=[];return this.forEach((t=>{e.push(t)})),e}toString(){const e=[];return this.forEach((t=>e.push(t))),"SortedSet("+e.toString()+")"}copy(e){const t=new se(this.comparator);return t.data=e,t}}class Sf{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function Dr(n){return n.hasNext()?n.getNext():void 0}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ze{constructor(e){this.fields=e,e.sort(he.comparator)}static empty(){return new Ze([])}unionWith(e){let t=new se(he.comparator);for(const r of this.fields)t=t.add(r);for(const r of e)t=t.add(r);return new Ze(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return Kr(this.fields,e.fields,((t,r)=>t.isEqual(r)))}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xg extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function UR(){return typeof atob<"u"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ye{constructor(e){this.binaryString=e}static fromBase64String(e){const t=(function(i){try{return atob(i)}catch(s){throw typeof DOMException<"u"&&s instanceof DOMException?new Xg("Invalid base64 string: "+s):s}})(e);return new ye(t)}static fromUint8Array(e){const t=(function(i){let s="";for(let o=0;o<i.length;++o)s+=String.fromCharCode(i[o]);return s})(e);return new ye(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return(function(t){return btoa(t)})(this.binaryString)}toUint8Array(){return(function(t){const r=new Uint8Array(t.length);for(let i=0;i<t.length;i++)r[i]=t.charCodeAt(i);return r})(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return K(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}ye.EMPTY_BYTE_STRING=new ye("");const BR=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Ht(n){if($(!!n,39018),typeof n=="string"){let e=0;const t=BR.exec(n);if($(!!t,46558,{timestamp:n}),t[1]){let i=t[1];i=(i+"000000000").substr(0,9),e=Number(i)}const r=new Date(n);return{seconds:Math.floor(r.getTime()/1e3),nanos:e}}return{seconds:pe(n.seconds),nanos:pe(n.nanos)}}function pe(n){return typeof n=="number"?n:typeof n=="string"?Number(n):0}function Qt(n){return typeof n=="string"?ye.fromBase64String(n):ye.fromUint8Array(n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Zg="server_timestamp",e_="__type__",t_="__previous_value__",n_="__local_write_time__";function Ga(n){var e,t;return((t=(((e=n==null?void 0:n.mapValue)===null||e===void 0?void 0:e.fields)||{})[e_])===null||t===void 0?void 0:t.stringValue)===Zg}function Ka(n){const e=n.mapValue.fields[t_];return Ga(e)?Ka(e):e}function Ns(n){const e=Ht(n.mapValue.fields[n_].timestampValue);return new ne(e.seconds,e.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qR{constructor(e,t,r,i,s,o,c,u,l,d){this.databaseId=e,this.appId=t,this.persistenceKey=r,this.host=i,this.ssl=s,this.forceLongPolling=o,this.autoDetectLongPolling=c,this.longPollingOptions=u,this.useFetchStreams=l,this.isUsingEmulator=d}}const Vs="(default)";class An{constructor(e,t){this.projectId=e,this.database=t||Vs}static empty(){return new An("","")}get isDefaultDatabase(){return this.database===Vs}isEqual(e){return e instanceof An&&e.projectId===this.projectId&&e.database===this.database}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bl="__type__",r_="__max__",mn={mapValue:{fields:{__type__:{stringValue:r_}}}},Rl="__vector__",ei="value",zo={nullValue:"NULL_VALUE"};function bn(n){return"nullValue"in n?0:"booleanValue"in n?1:"integerValue"in n||"doubleValue"in n?2:"timestampValue"in n?3:"stringValue"in n?5:"bytesValue"in n?6:"referenceValue"in n?7:"geoPointValue"in n?8:"arrayValue"in n?9:"mapValue"in n?Ga(n)?4:i_(n)?9007199254740991:Wa(n)?10:11:q(28295,{value:n})}function Dt(n,e){if(n===e)return!0;const t=bn(n);if(t!==bn(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return n.booleanValue===e.booleanValue;case 4:return Ns(n).isEqual(Ns(e));case 3:return(function(i,s){if(typeof i.timestampValue=="string"&&typeof s.timestampValue=="string"&&i.timestampValue.length===s.timestampValue.length)return i.timestampValue===s.timestampValue;const o=Ht(i.timestampValue),c=Ht(s.timestampValue);return o.seconds===c.seconds&&o.nanos===c.nanos})(n,e);case 5:return n.stringValue===e.stringValue;case 6:return(function(i,s){return Qt(i.bytesValue).isEqual(Qt(s.bytesValue))})(n,e);case 7:return n.referenceValue===e.referenceValue;case 8:return(function(i,s){return pe(i.geoPointValue.latitude)===pe(s.geoPointValue.latitude)&&pe(i.geoPointValue.longitude)===pe(s.geoPointValue.longitude)})(n,e);case 2:return(function(i,s){if("integerValue"in i&&"integerValue"in s)return pe(i.integerValue)===pe(s.integerValue);if("doubleValue"in i&&"doubleValue"in s){const o=pe(i.doubleValue),c=pe(s.doubleValue);return o===c?Ps(o)===Ps(c):isNaN(o)&&isNaN(c)}return!1})(n,e);case 9:return Kr(n.arrayValue.values||[],e.arrayValue.values||[],Dt);case 10:case 11:return(function(i,s){const o=i.mapValue.fields||{},c=s.mapValue.fields||{};if(Rf(o)!==Rf(c))return!1;for(const u in o)if(o.hasOwnProperty(u)&&(c[u]===void 0||!Dt(o[u],c[u])))return!1;return!0})(n,e);default:return q(52216,{left:n})}}function Os(n,e){return(n.values||[]).find((t=>Dt(t,e)))!==void 0}function Rn(n,e){if(n===e)return 0;const t=bn(n),r=bn(e);if(t!==r)return K(t,r);switch(t){case 0:case 9007199254740991:return 0;case 1:return K(n.booleanValue,e.booleanValue);case 2:return(function(s,o){const c=pe(s.integerValue||s.doubleValue),u=pe(o.integerValue||o.doubleValue);return c<u?-1:c>u?1:c===u?0:isNaN(c)?isNaN(u)?0:-1:1})(n,e);case 3:return Pf(n.timestampValue,e.timestampValue);case 4:return Pf(Ns(n),Ns(e));case 5:return yu(n.stringValue,e.stringValue);case 6:return(function(s,o){const c=Qt(s),u=Qt(o);return c.compareTo(u)})(n.bytesValue,e.bytesValue);case 7:return(function(s,o){const c=s.split("/"),u=o.split("/");for(let l=0;l<c.length&&l<u.length;l++){const d=K(c[l],u[l]);if(d!==0)return d}return K(c.length,u.length)})(n.referenceValue,e.referenceValue);case 8:return(function(s,o){const c=K(pe(s.latitude),pe(o.latitude));return c!==0?c:K(pe(s.longitude),pe(o.longitude))})(n.geoPointValue,e.geoPointValue);case 9:return Cf(n.arrayValue,e.arrayValue);case 10:return(function(s,o){var c,u,l,d;const p=s.fields||{},m=o.fields||{},T=(c=p[ei])===null||c===void 0?void 0:c.arrayValue,P=(u=m[ei])===null||u===void 0?void 0:u.arrayValue,D=K(((l=T==null?void 0:T.values)===null||l===void 0?void 0:l.length)||0,((d=P==null?void 0:P.values)===null||d===void 0?void 0:d.length)||0);return D!==0?D:Cf(T,P)})(n.mapValue,e.mapValue);case 11:return(function(s,o){if(s===mn.mapValue&&o===mn.mapValue)return 0;if(s===mn.mapValue)return 1;if(o===mn.mapValue)return-1;const c=s.fields||{},u=Object.keys(c),l=o.fields||{},d=Object.keys(l);u.sort(),d.sort();for(let p=0;p<u.length&&p<d.length;++p){const m=yu(u[p],d[p]);if(m!==0)return m;const T=Rn(c[u[p]],l[d[p]]);if(T!==0)return T}return K(u.length,d.length)})(n.mapValue,e.mapValue);default:throw q(23264,{le:t})}}function Pf(n,e){if(typeof n=="string"&&typeof e=="string"&&n.length===e.length)return K(n,e);const t=Ht(n),r=Ht(e),i=K(t.seconds,r.seconds);return i!==0?i:K(t.nanos,r.nanos)}function Cf(n,e){const t=n.values||[],r=e.values||[];for(let i=0;i<t.length&&i<r.length;++i){const s=Rn(t[i],r[i]);if(s)return s}return K(t.length,r.length)}function ti(n){return bu(n)}function bu(n){return"nullValue"in n?"null":"booleanValue"in n?""+n.booleanValue:"integerValue"in n?""+n.integerValue:"doubleValue"in n?""+n.doubleValue:"timestampValue"in n?(function(t){const r=Ht(t);return`time(${r.seconds},${r.nanos})`})(n.timestampValue):"stringValue"in n?n.stringValue:"bytesValue"in n?(function(t){return Qt(t).toBase64()})(n.bytesValue):"referenceValue"in n?(function(t){return x.fromName(t).toString()})(n.referenceValue):"geoPointValue"in n?(function(t){return`geo(${t.latitude},${t.longitude})`})(n.geoPointValue):"arrayValue"in n?(function(t){let r="[",i=!0;for(const s of t.values||[])i?i=!1:r+=",",r+=bu(s);return r+"]"})(n.arrayValue):"mapValue"in n?(function(t){const r=Object.keys(t.fields||{}).sort();let i="{",s=!0;for(const o of r)s?s=!1:i+=",",i+=`${o}:${bu(t.fields[o])}`;return i+"}"})(n.mapValue):q(61005,{value:n})}function Go(n){switch(bn(n)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=Ka(n);return e?16+Go(e):16;case 5:return 2*n.stringValue.length;case 6:return Qt(n.bytesValue).approximateByteSize();case 7:return n.referenceValue.length;case 9:return(function(r){return(r.values||[]).reduce(((i,s)=>i+Go(s)),0)})(n.arrayValue);case 10:case 11:return(function(r){let i=0;return On(r.fields,((s,o)=>{i+=s.length+Go(o)})),i})(n.mapValue);default:throw q(13486,{value:n})}}function or(n,e){return{referenceValue:`projects/${n.projectId}/databases/${n.database}/documents/${e.path.canonicalString()}`}}function Ru(n){return!!n&&"integerValue"in n}function xs(n){return!!n&&"arrayValue"in n}function kf(n){return!!n&&"nullValue"in n}function Df(n){return!!n&&"doubleValue"in n&&isNaN(Number(n.doubleValue))}function Ko(n){return!!n&&"mapValue"in n}function Wa(n){var e,t;return((t=(((e=n==null?void 0:n.mapValue)===null||e===void 0?void 0:e.fields)||{})[bl])===null||t===void 0?void 0:t.stringValue)===Rl}function gs(n){if(n.geoPointValue)return{geoPointValue:Object.assign({},n.geoPointValue)};if(n.timestampValue&&typeof n.timestampValue=="object")return{timestampValue:Object.assign({},n.timestampValue)};if(n.mapValue){const e={mapValue:{fields:{}}};return On(n.mapValue.fields,((t,r)=>e.mapValue.fields[t]=gs(r))),e}if(n.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(n.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=gs(n.arrayValue.values[t]);return e}return Object.assign({},n)}function i_(n){return(((n.mapValue||{}).fields||{}).__type__||{}).stringValue===r_}const s_={mapValue:{fields:{[bl]:{stringValue:Rl},[ei]:{arrayValue:{}}}}};function jR(n){return"nullValue"in n?zo:"booleanValue"in n?{booleanValue:!1}:"integerValue"in n||"doubleValue"in n?{doubleValue:NaN}:"timestampValue"in n?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in n?{stringValue:""}:"bytesValue"in n?{bytesValue:""}:"referenceValue"in n?or(An.empty(),x.empty()):"geoPointValue"in n?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in n?{arrayValue:{}}:"mapValue"in n?Wa(n)?s_:{mapValue:{}}:q(35942,{value:n})}function $R(n){return"nullValue"in n?{booleanValue:!1}:"booleanValue"in n?{doubleValue:NaN}:"integerValue"in n||"doubleValue"in n?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in n?{stringValue:""}:"stringValue"in n?{bytesValue:""}:"bytesValue"in n?or(An.empty(),x.empty()):"referenceValue"in n?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in n?{arrayValue:{}}:"arrayValue"in n?s_:"mapValue"in n?Wa(n)?{mapValue:{}}:mn:q(61959,{value:n})}function Nf(n,e){const t=Rn(n.value,e.value);return t!==0?t:n.inclusive&&!e.inclusive?-1:!n.inclusive&&e.inclusive?1:0}function Vf(n,e){const t=Rn(n.value,e.value);return t!==0?t:n.inclusive&&!e.inclusive?1:!n.inclusive&&e.inclusive?-1:0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Me{constructor(e){this.value=e}static empty(){return new Me({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let r=0;r<e.length-1;++r)if(t=(t.mapValue.fields||{})[e.get(r)],!Ko(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=gs(t)}setAll(e){let t=he.emptyPath(),r={},i=[];e.forEach(((o,c)=>{if(!t.isImmediateParentOf(c)){const u=this.getFieldsMap(t);this.applyChanges(u,r,i),r={},i=[],t=c.popLast()}o?r[c.lastSegment()]=gs(o):i.push(c.lastSegment())}));const s=this.getFieldsMap(t);this.applyChanges(s,r,i)}delete(e){const t=this.field(e.popLast());Ko(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return Dt(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let r=0;r<e.length;++r){let i=t.mapValue.fields[e.get(r)];Ko(i)&&i.mapValue.fields||(i={mapValue:{fields:{}}},t.mapValue.fields[e.get(r)]=i),t=i}return t.mapValue.fields}applyChanges(e,t,r){On(t,((i,s)=>e[i]=s));for(const i of r)delete e[i]}clone(){return new Me(gs(this.value))}}function o_(n){const e=[];return On(n.fields,((t,r)=>{const i=new he([t]);if(Ko(r)){const s=o_(r.mapValue).fields;if(s.length===0)e.push(i);else for(const o of s)e.push(i.child(o))}else e.push(i)})),new Ze(e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class le{constructor(e,t,r,i,s,o,c){this.key=e,this.documentType=t,this.version=r,this.readTime=i,this.createTime=s,this.data=o,this.documentState=c}static newInvalidDocument(e){return new le(e,0,z.min(),z.min(),z.min(),Me.empty(),0)}static newFoundDocument(e,t,r,i){return new le(e,1,t,z.min(),r,i,0)}static newNoDocument(e,t){return new le(e,2,t,z.min(),z.min(),Me.empty(),0)}static newUnknownDocument(e,t){return new le(e,3,t,z.min(),z.min(),Me.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(z.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=Me.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=Me.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=z.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof le&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new le(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sn{constructor(e,t){this.position=e,this.inclusive=t}}function Of(n,e,t){let r=0;for(let i=0;i<n.position.length;i++){const s=e[i],o=n.position[i];if(s.field.isKeyField()?r=x.comparator(x.fromName(o.referenceValue),t.key):r=Rn(o,t.data.field(s.field)),s.dir==="desc"&&(r*=-1),r!==0)break}return r}function xf(n,e){if(n===null)return e===null;if(e===null||n.inclusive!==e.inclusive||n.position.length!==e.position.length)return!1;for(let t=0;t<n.position.length;t++)if(!Dt(n.position[t],e.position[t]))return!1;return!0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ls{constructor(e,t="asc"){this.field=e,this.dir=t}}function zR(n,e){return n.dir===e.dir&&n.field.isEqual(e.field)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class a_{}class Z extends a_{constructor(e,t,r){super(),this.field=e,this.op=t,this.value=r}static create(e,t,r){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,r):new GR(e,t,r):t==="array-contains"?new HR(e,r):t==="in"?new f_(e,r):t==="not-in"?new QR(e,r):t==="array-contains-any"?new YR(e,r):new Z(e,t,r)}static createKeyFieldInFilter(e,t,r){return t==="in"?new KR(e,r):new WR(e,r)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(Rn(t,this.value)):t!==null&&bn(this.value)===bn(t)&&this.matchesComparison(Rn(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return q(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class re extends a_{constructor(e,t){super(),this.filters=e,this.op=t,this.he=null}static create(e,t){return new re(e,t)}matches(e){return ni(this)?this.filters.find((t=>!t.matches(e)))===void 0:this.filters.find((t=>t.matches(e)))!==void 0}getFlattenedFilters(){return this.he!==null||(this.he=this.filters.reduce(((e,t)=>e.concat(t.getFlattenedFilters())),[])),this.he}getFilters(){return Object.assign([],this.filters)}}function ni(n){return n.op==="and"}function Su(n){return n.op==="or"}function Sl(n){return c_(n)&&ni(n)}function c_(n){for(const e of n.filters)if(e instanceof re)return!1;return!0}function Pu(n){if(n instanceof Z)return n.field.canonicalString()+n.op.toString()+ti(n.value);if(Sl(n))return n.filters.map((e=>Pu(e))).join(",");{const e=n.filters.map((t=>Pu(t))).join(",");return`${n.op}(${e})`}}function u_(n,e){return n instanceof Z?(function(r,i){return i instanceof Z&&r.op===i.op&&r.field.isEqual(i.field)&&Dt(r.value,i.value)})(n,e):n instanceof re?(function(r,i){return i instanceof re&&r.op===i.op&&r.filters.length===i.filters.length?r.filters.reduce(((s,o,c)=>s&&u_(o,i.filters[c])),!0):!1})(n,e):void q(19439)}function l_(n,e){const t=n.filters.concat(e);return re.create(t,n.op)}function h_(n){return n instanceof Z?(function(t){return`${t.field.canonicalString()} ${t.op} ${ti(t.value)}`})(n):n instanceof re?(function(t){return t.op.toString()+" {"+t.getFilters().map(h_).join(" ,")+"}"})(n):"Filter"}class GR extends Z{constructor(e,t,r){super(e,t,r),this.key=x.fromName(r.referenceValue)}matches(e){const t=x.comparator(e.key,this.key);return this.matchesComparison(t)}}class KR extends Z{constructor(e,t){super(e,"in",t),this.keys=d_("in",t)}matches(e){return this.keys.some((t=>t.isEqual(e.key)))}}class WR extends Z{constructor(e,t){super(e,"not-in",t),this.keys=d_("not-in",t)}matches(e){return!this.keys.some((t=>t.isEqual(e.key)))}}function d_(n,e){var t;return(((t=e.arrayValue)===null||t===void 0?void 0:t.values)||[]).map((r=>x.fromName(r.referenceValue)))}class HR extends Z{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return xs(t)&&Os(t.arrayValue,this.value)}}class f_ extends Z{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&Os(this.value.arrayValue,t)}}class QR extends Z{constructor(e,t){super(e,"not-in",t)}matches(e){if(Os(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!Os(this.value.arrayValue,t)}}class YR extends Z{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!xs(t)||!t.arrayValue.values)&&t.arrayValue.values.some((r=>Os(this.value.arrayValue,r)))}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class JR{constructor(e,t=null,r=[],i=[],s=null,o=null,c=null){this.path=e,this.collectionGroup=t,this.orderBy=r,this.filters=i,this.limit=s,this.startAt=o,this.endAt=c,this.Pe=null}}function Cu(n,e=null,t=[],r=[],i=null,s=null,o=null){return new JR(n,e,t,r,i,s,o)}function ar(n){const e=L(n);if(e.Pe===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map((r=>Pu(r))).join(","),t+="|ob:",t+=e.orderBy.map((r=>(function(s){return s.field.canonicalString()+s.dir})(r))).join(","),Gs(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map((r=>ti(r))).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map((r=>ti(r))).join(",")),e.Pe=t}return e.Pe}function Ws(n,e){if(n.limit!==e.limit||n.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<n.orderBy.length;t++)if(!zR(n.orderBy[t],e.orderBy[t]))return!1;if(n.filters.length!==e.filters.length)return!1;for(let t=0;t<n.filters.length;t++)if(!u_(n.filters[t],e.filters[t]))return!1;return n.collectionGroup===e.collectionGroup&&!!n.path.isEqual(e.path)&&!!xf(n.startAt,e.startAt)&&xf(n.endAt,e.endAt)}function ua(n){return x.isDocumentKey(n.path)&&n.collectionGroup===null&&n.filters.length===0}function la(n,e){return n.filters.filter((t=>t instanceof Z&&t.field.isEqual(e)))}function Lf(n,e,t){let r=zo,i=!0;for(const s of la(n,e)){let o=zo,c=!0;switch(s.op){case"<":case"<=":o=jR(s.value);break;case"==":case"in":case">=":o=s.value;break;case">":o=s.value,c=!1;break;case"!=":case"not-in":o=zo}Nf({value:r,inclusive:i},{value:o,inclusive:c})<0&&(r=o,i=c)}if(t!==null){for(let s=0;s<n.orderBy.length;++s)if(n.orderBy[s].field.isEqual(e)){const o=t.position[s];Nf({value:r,inclusive:i},{value:o,inclusive:t.inclusive})<0&&(r=o,i=t.inclusive);break}}return{value:r,inclusive:i}}function Mf(n,e,t){let r=mn,i=!0;for(const s of la(n,e)){let o=mn,c=!0;switch(s.op){case">=":case">":o=$R(s.value),c=!1;break;case"==":case"in":case"<=":o=s.value;break;case"<":o=s.value,c=!1;break;case"!=":case"not-in":o=mn}Vf({value:r,inclusive:i},{value:o,inclusive:c})>0&&(r=o,i=c)}if(t!==null){for(let s=0;s<n.orderBy.length;++s)if(n.orderBy[s].field.isEqual(e)){const o=t.position[s];Vf({value:r,inclusive:i},{value:o,inclusive:t.inclusive})>0&&(r=o,i=t.inclusive);break}}return{value:r,inclusive:i}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zt{constructor(e,t=null,r=[],i=[],s=null,o="F",c=null,u=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=r,this.filters=i,this.limit=s,this.limitType=o,this.startAt=c,this.endAt=u,this.Te=null,this.Ie=null,this.de=null,this.startAt,this.endAt}}function p_(n,e,t,r,i,s,o,c){return new Zt(n,e,t,r,i,s,o,c)}function Ii(n){return new Zt(n)}function Ff(n){return n.filters.length===0&&n.limit===null&&n.startAt==null&&n.endAt==null&&(n.explicitOrderBy.length===0||n.explicitOrderBy.length===1&&n.explicitOrderBy[0].field.isKeyField())}function Pl(n){return n.collectionGroup!==null}function $r(n){const e=L(n);if(e.Te===null){e.Te=[];const t=new Set;for(const s of e.explicitOrderBy)e.Te.push(s),t.add(s.field.canonicalString());const r=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let c=new se(he.comparator);return o.filters.forEach((u=>{u.getFlattenedFilters().forEach((l=>{l.isInequality()&&(c=c.add(l.field))}))})),c})(e).forEach((s=>{t.has(s.canonicalString())||s.isKeyField()||e.Te.push(new Ls(s,r))})),t.has(he.keyField().canonicalString())||e.Te.push(new Ls(he.keyField(),r))}return e.Te}function Ge(n){const e=L(n);return e.Ie||(e.Ie=g_(e,$r(n))),e.Ie}function m_(n){const e=L(n);return e.de||(e.de=g_(e,n.explicitOrderBy)),e.de}function g_(n,e){if(n.limitType==="F")return Cu(n.path,n.collectionGroup,e,n.filters,n.limit,n.startAt,n.endAt);{e=e.map((i=>{const s=i.dir==="desc"?"asc":"desc";return new Ls(i.field,s)}));const t=n.endAt?new Sn(n.endAt.position,n.endAt.inclusive):null,r=n.startAt?new Sn(n.startAt.position,n.startAt.inclusive):null;return Cu(n.path,n.collectionGroup,e,n.filters,n.limit,t,r)}}function ku(n,e){const t=n.filters.concat([e]);return new Zt(n.path,n.collectionGroup,n.explicitOrderBy.slice(),t,n.limit,n.limitType,n.startAt,n.endAt)}function ha(n,e,t){return new Zt(n.path,n.collectionGroup,n.explicitOrderBy.slice(),n.filters.slice(),e,t,n.startAt,n.endAt)}function Hs(n,e){return Ws(Ge(n),Ge(e))&&n.limitType===e.limitType}function __(n){return`${ar(Ge(n))}|lt:${n.limitType}`}function Mr(n){return`Query(target=${(function(t){let r=t.path.canonicalString();return t.collectionGroup!==null&&(r+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(r+=`, filters: [${t.filters.map((i=>h_(i))).join(", ")}]`),Gs(t.limit)||(r+=", limit: "+t.limit),t.orderBy.length>0&&(r+=`, orderBy: [${t.orderBy.map((i=>(function(o){return`${o.field.canonicalString()} (${o.dir})`})(i))).join(", ")}]`),t.startAt&&(r+=", startAt: ",r+=t.startAt.inclusive?"b:":"a:",r+=t.startAt.position.map((i=>ti(i))).join(",")),t.endAt&&(r+=", endAt: ",r+=t.endAt.inclusive?"a:":"b:",r+=t.endAt.position.map((i=>ti(i))).join(",")),`Target(${r})`})(Ge(n))}; limitType=${n.limitType})`}function Qs(n,e){return e.isFoundDocument()&&(function(r,i){const s=i.key.path;return r.collectionGroup!==null?i.key.hasCollectionId(r.collectionGroup)&&r.path.isPrefixOf(s):x.isDocumentKey(r.path)?r.path.isEqual(s):r.path.isImmediateParentOf(s)})(n,e)&&(function(r,i){for(const s of $r(r))if(!s.field.isKeyField()&&i.data.field(s.field)===null)return!1;return!0})(n,e)&&(function(r,i){for(const s of r.filters)if(!s.matches(i))return!1;return!0})(n,e)&&(function(r,i){return!(r.startAt&&!(function(o,c,u){const l=Of(o,c,u);return o.inclusive?l<=0:l<0})(r.startAt,$r(r),i)||r.endAt&&!(function(o,c,u){const l=Of(o,c,u);return o.inclusive?l>=0:l>0})(r.endAt,$r(r),i))})(n,e)}function y_(n){return n.collectionGroup||(n.path.length%2==1?n.path.lastSegment():n.path.get(n.path.length-2))}function I_(n){return(e,t)=>{let r=!1;for(const i of $r(n)){const s=XR(i,e,t);if(s!==0)return s;r=r||i.field.isKeyField()}return 0}}function XR(n,e,t){const r=n.field.isKeyField()?x.comparator(e.key,t.key):(function(s,o,c){const u=o.data.field(s),l=c.data.field(s);return u!==null&&l!==null?Rn(u,l):q(42886)})(n.field,e,t);switch(n.dir){case"asc":return r;case"desc":return-1*r;default:return q(19790,{direction:n.dir})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class en{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),r=this.inner[t];if(r!==void 0){for(const[i,s]of r)if(this.equalsFn(i,e))return s}}has(e){return this.get(e)!==void 0}set(e,t){const r=this.mapKeyFn(e),i=this.inner[r];if(i===void 0)return this.inner[r]=[[e,t]],void this.innerSize++;for(let s=0;s<i.length;s++)if(this.equalsFn(i[s][0],e))return void(i[s]=[e,t]);i.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),r=this.inner[t];if(r===void 0)return!1;for(let i=0;i<r.length;i++)if(this.equalsFn(r[i][0],e))return r.length===1?delete this.inner[t]:r.splice(i,1),this.innerSize--,!0;return!1}forEach(e){On(this.inner,((t,r)=>{for(const[i,s]of r)e(i,s)}))}isEmpty(){return Jg(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ZR=new ce(x.comparator);function et(){return ZR}const T_=new ce(x.comparator);function is(...n){let e=T_;for(const t of n)e=e.insert(t.key,t);return e}function E_(n){let e=T_;return n.forEach(((t,r)=>e=e.insert(t,r.overlayedDocument))),e}function Rt(){return _s()}function v_(){return _s()}function _s(){return new en((n=>n.toString()),((n,e)=>n.isEqual(e)))}const eS=new ce(x.comparator),tS=new se(x.comparator);function H(...n){let e=tS;for(const t of n)e=e.add(t);return e}const nS=new se(K);function Cl(){return nS}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function kl(n,e){if(n.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:Ps(e)?"-0":e}}function w_(n){return{integerValue:""+n}}function A_(n,e){return Ug(e)?w_(e):kl(n,e)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ha{constructor(){this._=void 0}}function rS(n,e,t){return n instanceof ri?(function(i,s){const o={fields:{[e_]:{stringValue:Zg},[n_]:{timestampValue:{seconds:i.seconds,nanos:i.nanoseconds}}}};return s&&Ga(s)&&(s=Ka(s)),s&&(o.fields[t_]=s),{mapValue:o}})(t,e):n instanceof cr?R_(n,e):n instanceof ur?S_(n,e):(function(i,s){const o=b_(i,s),c=Uf(o)+Uf(i.Ee);return Ru(o)&&Ru(i.Ee)?w_(c):kl(i.serializer,c)})(n,e)}function iS(n,e,t){return n instanceof cr?R_(n,e):n instanceof ur?S_(n,e):t}function b_(n,e){return n instanceof ii?(function(r){return Ru(r)||(function(s){return!!s&&"doubleValue"in s})(r)})(e)?e:{integerValue:0}:null}class ri extends Ha{}class cr extends Ha{constructor(e){super(),this.elements=e}}function R_(n,e){const t=P_(e);for(const r of n.elements)t.some((i=>Dt(i,r)))||t.push(r);return{arrayValue:{values:t}}}class ur extends Ha{constructor(e){super(),this.elements=e}}function S_(n,e){let t=P_(e);for(const r of n.elements)t=t.filter((i=>!Dt(i,r)));return{arrayValue:{values:t}}}class ii extends Ha{constructor(e,t){super(),this.serializer=e,this.Ee=t}}function Uf(n){return pe(n.integerValue||n.doubleValue)}function P_(n){return xs(n)&&n.arrayValue.values?n.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ys{constructor(e,t){this.field=e,this.transform=t}}function sS(n,e){return n.field.isEqual(e.field)&&(function(r,i){return r instanceof cr&&i instanceof cr||r instanceof ur&&i instanceof ur?Kr(r.elements,i.elements,Dt):r instanceof ii&&i instanceof ii?Dt(r.Ee,i.Ee):r instanceof ri&&i instanceof ri})(n.transform,e.transform)}class oS{constructor(e,t){this.version=e,this.transformResults=t}}class ge{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new ge}static exists(e){return new ge(void 0,e)}static updateTime(e){return new ge(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function Wo(n,e){return n.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(n.updateTime):n.exists===void 0||n.exists===e.isFoundDocument()}class Qa{}function C_(n,e){if(!n.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return n.isNoDocument()?new Ei(n.key,ge.none()):new Ti(n.key,n.data,ge.none());{const t=n.data,r=Me.empty();let i=new se(he.comparator);for(let s of e.fields)if(!i.has(s)){let o=t.field(s);o===null&&s.length>1&&(s=s.popLast(),o=t.field(s)),o===null?r.delete(s):r.set(s,o),i=i.add(s)}return new tn(n.key,r,new Ze(i.toArray()),ge.none())}}function aS(n,e,t){n instanceof Ti?(function(i,s,o){const c=i.value.clone(),u=qf(i.fieldTransforms,s,o.transformResults);c.setAll(u),s.convertToFoundDocument(o.version,c).setHasCommittedMutations()})(n,e,t):n instanceof tn?(function(i,s,o){if(!Wo(i.precondition,s))return void s.convertToUnknownDocument(o.version);const c=qf(i.fieldTransforms,s,o.transformResults),u=s.data;u.setAll(k_(i)),u.setAll(c),s.convertToFoundDocument(o.version,u).setHasCommittedMutations()})(n,e,t):(function(i,s,o){s.convertToNoDocument(o.version).setHasCommittedMutations()})(0,e,t)}function ys(n,e,t,r){return n instanceof Ti?(function(s,o,c,u){if(!Wo(s.precondition,o))return c;const l=s.value.clone(),d=jf(s.fieldTransforms,u,o);return l.setAll(d),o.convertToFoundDocument(o.version,l).setHasLocalMutations(),null})(n,e,t,r):n instanceof tn?(function(s,o,c,u){if(!Wo(s.precondition,o))return c;const l=jf(s.fieldTransforms,u,o),d=o.data;return d.setAll(k_(s)),d.setAll(l),o.convertToFoundDocument(o.version,d).setHasLocalMutations(),c===null?null:c.unionWith(s.fieldMask.fields).unionWith(s.fieldTransforms.map((p=>p.field)))})(n,e,t,r):(function(s,o,c){return Wo(s.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):c})(n,e,t)}function cS(n,e){let t=null;for(const r of n.fieldTransforms){const i=e.data.field(r.field),s=b_(r.transform,i||null);s!=null&&(t===null&&(t=Me.empty()),t.set(r.field,s))}return t||null}function Bf(n,e){return n.type===e.type&&!!n.key.isEqual(e.key)&&!!n.precondition.isEqual(e.precondition)&&!!(function(r,i){return r===void 0&&i===void 0||!(!r||!i)&&Kr(r,i,((s,o)=>sS(s,o)))})(n.fieldTransforms,e.fieldTransforms)&&(n.type===0?n.value.isEqual(e.value):n.type!==1||n.data.isEqual(e.data)&&n.fieldMask.isEqual(e.fieldMask))}class Ti extends Qa{constructor(e,t,r,i=[]){super(),this.key=e,this.value=t,this.precondition=r,this.fieldTransforms=i,this.type=0}getFieldMask(){return null}}class tn extends Qa{constructor(e,t,r,i,s=[]){super(),this.key=e,this.data=t,this.fieldMask=r,this.precondition=i,this.fieldTransforms=s,this.type=1}getFieldMask(){return this.fieldMask}}function k_(n){const e=new Map;return n.fieldMask.fields.forEach((t=>{if(!t.isEmpty()){const r=n.data.field(t);e.set(t,r)}})),e}function qf(n,e,t){const r=new Map;$(n.length===t.length,32656,{Ae:t.length,Re:n.length});for(let i=0;i<t.length;i++){const s=n[i],o=s.transform,c=e.data.field(s.field);r.set(s.field,iS(o,c,t[i]))}return r}function jf(n,e,t){const r=new Map;for(const i of n){const s=i.transform,o=t.data.field(i.field);r.set(i.field,rS(s,o,e))}return r}class Ei extends Qa{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class Dl extends Qa{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nl{constructor(e,t,r,i){this.batchId=e,this.localWriteTime=t,this.baseMutations=r,this.mutations=i}applyToRemoteDocument(e,t){const r=t.mutationResults;for(let i=0;i<this.mutations.length;i++){const s=this.mutations[i];s.key.isEqual(e.key)&&aS(s,e,r[i])}}applyToLocalView(e,t){for(const r of this.baseMutations)r.key.isEqual(e.key)&&(t=ys(r,e,t,this.localWriteTime));for(const r of this.mutations)r.key.isEqual(e.key)&&(t=ys(r,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const r=v_();return this.mutations.forEach((i=>{const s=e.get(i.key),o=s.overlayedDocument;let c=this.applyToLocalView(o,s.mutatedFields);c=t.has(i.key)?null:c;const u=C_(o,c);u!==null&&r.set(i.key,u),o.isValidDocument()||o.convertToNoDocument(z.min())})),r}keys(){return this.mutations.reduce(((e,t)=>e.add(t.key)),H())}isEqual(e){return this.batchId===e.batchId&&Kr(this.mutations,e.mutations,((t,r)=>Bf(t,r)))&&Kr(this.baseMutations,e.baseMutations,((t,r)=>Bf(t,r)))}}class Vl{constructor(e,t,r,i){this.batch=e,this.commitVersion=t,this.mutationResults=r,this.docVersions=i}static from(e,t,r){$(e.mutations.length===r.length,58842,{Ve:e.mutations.length,me:r.length});let i=(function(){return eS})();const s=e.mutations;for(let o=0;o<s.length;o++)i=i.insert(s[o].key,r[o].version);return new Vl(e,t,r,i)}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ol{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class D_{constructor(e,t,r){this.alias=e,this.aggregateType=t,this.fieldPath=r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uS{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var be,ee;function N_(n){switch(n){case R.OK:return q(64938);case R.CANCELLED:case R.UNKNOWN:case R.DEADLINE_EXCEEDED:case R.RESOURCE_EXHAUSTED:case R.INTERNAL:case R.UNAVAILABLE:case R.UNAUTHENTICATED:return!1;case R.INVALID_ARGUMENT:case R.NOT_FOUND:case R.ALREADY_EXISTS:case R.PERMISSION_DENIED:case R.FAILED_PRECONDITION:case R.ABORTED:case R.OUT_OF_RANGE:case R.UNIMPLEMENTED:case R.DATA_LOSS:return!0;default:return q(15467,{code:n})}}function V_(n){if(n===void 0)return we("GRPC error has no .code"),R.UNKNOWN;switch(n){case be.OK:return R.OK;case be.CANCELLED:return R.CANCELLED;case be.UNKNOWN:return R.UNKNOWN;case be.DEADLINE_EXCEEDED:return R.DEADLINE_EXCEEDED;case be.RESOURCE_EXHAUSTED:return R.RESOURCE_EXHAUSTED;case be.INTERNAL:return R.INTERNAL;case be.UNAVAILABLE:return R.UNAVAILABLE;case be.UNAUTHENTICATED:return R.UNAUTHENTICATED;case be.INVALID_ARGUMENT:return R.INVALID_ARGUMENT;case be.NOT_FOUND:return R.NOT_FOUND;case be.ALREADY_EXISTS:return R.ALREADY_EXISTS;case be.PERMISSION_DENIED:return R.PERMISSION_DENIED;case be.FAILED_PRECONDITION:return R.FAILED_PRECONDITION;case be.ABORTED:return R.ABORTED;case be.OUT_OF_RANGE:return R.OUT_OF_RANGE;case be.UNIMPLEMENTED:return R.UNIMPLEMENTED;case be.DATA_LOSS:return R.DATA_LOSS;default:return q(39323,{code:n})}}(ee=be||(be={}))[ee.OK=0]="OK",ee[ee.CANCELLED=1]="CANCELLED",ee[ee.UNKNOWN=2]="UNKNOWN",ee[ee.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",ee[ee.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",ee[ee.NOT_FOUND=5]="NOT_FOUND",ee[ee.ALREADY_EXISTS=6]="ALREADY_EXISTS",ee[ee.PERMISSION_DENIED=7]="PERMISSION_DENIED",ee[ee.UNAUTHENTICATED=16]="UNAUTHENTICATED",ee[ee.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",ee[ee.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",ee[ee.ABORTED=10]="ABORTED",ee[ee.OUT_OF_RANGE=11]="OUT_OF_RANGE",ee[ee.UNIMPLEMENTED=12]="UNIMPLEMENTED",ee[ee.INTERNAL=13]="INTERNAL",ee[ee.UNAVAILABLE=14]="UNAVAILABLE",ee[ee.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let da=null;/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lS=new En([4294967295,4294967295],0);function $f(n){const e=_l().encode(n),t=new Eg;return t.update(e),new Uint8Array(t.digest())}function zf(n){const e=new DataView(n.buffer),t=e.getUint32(0,!0),r=e.getUint32(4,!0),i=e.getUint32(8,!0),s=e.getUint32(12,!0);return[new En([t,r],0),new En([i,s],0)]}class xl{constructor(e,t,r){if(this.bitmap=e,this.padding=t,this.hashCount=r,t<0||t>=8)throw new ss(`Invalid padding: ${t}`);if(r<0)throw new ss(`Invalid hash count: ${r}`);if(e.length>0&&this.hashCount===0)throw new ss(`Invalid hash count: ${r}`);if(e.length===0&&t!==0)throw new ss(`Invalid padding when bitmap length is 0: ${t}`);this.fe=8*e.length-t,this.ge=En.fromNumber(this.fe)}pe(e,t,r){let i=e.add(t.multiply(En.fromNumber(r)));return i.compare(lS)===1&&(i=new En([i.getBits(0),i.getBits(1)],0)),i.modulo(this.ge).toNumber()}ye(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.fe===0)return!1;const t=$f(e),[r,i]=zf(t);for(let s=0;s<this.hashCount;s++){const o=this.pe(r,i,s);if(!this.ye(o))return!1}return!0}static create(e,t,r){const i=e%8==0?0:8-e%8,s=new Uint8Array(Math.ceil(e/8)),o=new xl(s,i,t);return r.forEach((c=>o.insert(c))),o}insert(e){if(this.fe===0)return;const t=$f(e),[r,i]=zf(t);for(let s=0;s<this.hashCount;s++){const o=this.pe(r,i,s);this.we(o)}}we(e){const t=Math.floor(e/8),r=e%8;this.bitmap[t]|=1<<r}}class ss extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Js{constructor(e,t,r,i,s){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=r,this.documentUpdates=i,this.resolvedLimboDocuments=s}static createSynthesizedRemoteEventForCurrentChange(e,t,r){const i=new Map;return i.set(e,Xs.createSynthesizedTargetChangeForCurrentChange(e,t,r)),new Js(z.min(),i,new ce(K),et(),H())}}class Xs{constructor(e,t,r,i,s){this.resumeToken=e,this.current=t,this.addedDocuments=r,this.modifiedDocuments=i,this.removedDocuments=s}static createSynthesizedTargetChangeForCurrentChange(e,t,r){return new Xs(r,t,H(),H(),H())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ho{constructor(e,t,r,i){this.Se=e,this.removedTargetIds=t,this.key=r,this.be=i}}class O_{constructor(e,t){this.targetId=e,this.De=t}}class x_{constructor(e,t,r=ye.EMPTY_BYTE_STRING,i=null){this.state=e,this.targetIds=t,this.resumeToken=r,this.cause=i}}class Gf{constructor(){this.ve=0,this.Ce=Kf(),this.Fe=ye.EMPTY_BYTE_STRING,this.Me=!1,this.xe=!0}get current(){return this.Me}get resumeToken(){return this.Fe}get Oe(){return this.ve!==0}get Ne(){return this.xe}Be(e){e.approximateByteSize()>0&&(this.xe=!0,this.Fe=e)}Le(){let e=H(),t=H(),r=H();return this.Ce.forEach(((i,s)=>{switch(s){case 0:e=e.add(i);break;case 2:t=t.add(i);break;case 1:r=r.add(i);break;default:q(38017,{changeType:s})}})),new Xs(this.Fe,this.Me,e,t,r)}ke(){this.xe=!1,this.Ce=Kf()}qe(e,t){this.xe=!0,this.Ce=this.Ce.insert(e,t)}Qe(e){this.xe=!0,this.Ce=this.Ce.remove(e)}$e(){this.ve+=1}Ue(){this.ve-=1,$(this.ve>=0,3241,{ve:this.ve})}Ke(){this.xe=!0,this.Me=!0}}class hS{constructor(e){this.We=e,this.Ge=new Map,this.ze=et(),this.je=Co(),this.Je=Co(),this.He=new ce(K)}Ye(e){for(const t of e.Se)e.be&&e.be.isFoundDocument()?this.Ze(t,e.be):this.Xe(t,e.key,e.be);for(const t of e.removedTargetIds)this.Xe(t,e.key,e.be)}et(e){this.forEachTarget(e,(t=>{const r=this.tt(t);switch(e.state){case 0:this.nt(t)&&r.Be(e.resumeToken);break;case 1:r.Ue(),r.Oe||r.ke(),r.Be(e.resumeToken);break;case 2:r.Ue(),r.Oe||this.removeTarget(t);break;case 3:this.nt(t)&&(r.Ke(),r.Be(e.resumeToken));break;case 4:this.nt(t)&&(this.rt(t),r.Be(e.resumeToken));break;default:q(56790,{state:e.state})}}))}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.Ge.forEach(((r,i)=>{this.nt(i)&&t(i)}))}it(e){const t=e.targetId,r=e.De.count,i=this.st(t);if(i){const s=i.target;if(ua(s))if(r===0){const o=new x(s.path);this.Xe(t,o,le.newNoDocument(o,z.min()))}else $(r===1,20013,{expectedCount:r});else{const o=this.ot(t);if(o!==r){const c=this._t(e),u=c?this.ut(c,e,o):1;if(u!==0){this.rt(t);const l=u===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.He=this.He.insert(t,l)}da==null||da.ct((function(d,p,m,T,P){var D,k,U,B,M,G;const J={localCacheCount:d,existenceFilterCount:p.count,databaseId:m.database,projectId:m.projectId},W=p.unchangedNames;return W&&(J.bloomFilter={applied:P===0,hashCount:(D=W==null?void 0:W.hashCount)!==null&&D!==void 0?D:0,bitmapLength:(B=(U=(k=W==null?void 0:W.bits)===null||k===void 0?void 0:k.bitmap)===null||U===void 0?void 0:U.length)!==null&&B!==void 0?B:0,padding:(G=(M=W==null?void 0:W.bits)===null||M===void 0?void 0:M.padding)!==null&&G!==void 0?G:0,mightContain:E=>{var _;return(_=T==null?void 0:T.mightContain(E))!==null&&_!==void 0&&_}}),J})(o,e.De,this.We.lt(),c,u))}}}}_t(e){const t=e.De.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:r="",padding:i=0},hashCount:s=0}=t;let o,c;try{o=Qt(r).toUint8Array()}catch(u){if(u instanceof Xg)return Ke("Decoding the base64 bloom filter in existence filter failed ("+u.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw u}try{c=new xl(o,i,s)}catch(u){return Ke(u instanceof ss?"BloomFilter error: ":"Applying bloom filter failed: ",u),null}return c.fe===0?null:c}ut(e,t,r){return t.De.count===r-this.ht(e,t.targetId)?0:2}ht(e,t){const r=this.We.getRemoteKeysForTarget(t);let i=0;return r.forEach((s=>{const o=this.We.lt(),c=`projects/${o.projectId}/databases/${o.database}/documents/${s.path.canonicalString()}`;e.mightContain(c)||(this.Xe(t,s,null),i++)})),i}Pt(e){const t=new Map;this.Ge.forEach(((s,o)=>{const c=this.st(o);if(c){if(s.current&&ua(c.target)){const u=new x(c.target.path);this.Tt(u).has(o)||this.It(o,u)||this.Xe(o,u,le.newNoDocument(u,e))}s.Ne&&(t.set(o,s.Le()),s.ke())}}));let r=H();this.Je.forEach(((s,o)=>{let c=!0;o.forEachWhile((u=>{const l=this.st(u);return!l||l.purpose==="TargetPurposeLimboResolution"||(c=!1,!1)})),c&&(r=r.add(s))})),this.ze.forEach(((s,o)=>o.setReadTime(e)));const i=new Js(e,t,this.He,this.ze,r);return this.ze=et(),this.je=Co(),this.Je=Co(),this.He=new ce(K),i}Ze(e,t){if(!this.nt(e))return;const r=this.It(e,t.key)?2:0;this.tt(e).qe(t.key,r),this.ze=this.ze.insert(t.key,t),this.je=this.je.insert(t.key,this.Tt(t.key).add(e)),this.Je=this.Je.insert(t.key,this.dt(t.key).add(e))}Xe(e,t,r){if(!this.nt(e))return;const i=this.tt(e);this.It(e,t)?i.qe(t,1):i.Qe(t),this.Je=this.Je.insert(t,this.dt(t).delete(e)),this.Je=this.Je.insert(t,this.dt(t).add(e)),r&&(this.ze=this.ze.insert(t,r))}removeTarget(e){this.Ge.delete(e)}ot(e){const t=this.tt(e).Le();return this.We.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}$e(e){this.tt(e).$e()}tt(e){let t=this.Ge.get(e);return t||(t=new Gf,this.Ge.set(e,t)),t}dt(e){let t=this.Je.get(e);return t||(t=new se(K),this.Je=this.Je.insert(e,t)),t}Tt(e){let t=this.je.get(e);return t||(t=new se(K),this.je=this.je.insert(e,t)),t}nt(e){const t=this.st(e)!==null;return t||V("WatchChangeAggregator","Detected inactive target",e),t}st(e){const t=this.Ge.get(e);return t&&t.Oe?null:this.We.Et(e)}rt(e){this.Ge.set(e,new Gf),this.We.getRemoteKeysForTarget(e).forEach((t=>{this.Xe(e,t,null)}))}It(e,t){return this.We.getRemoteKeysForTarget(e).has(t)}}function Co(){return new ce(x.comparator)}function Kf(){return new ce(x.comparator)}const dS={asc:"ASCENDING",desc:"DESCENDING"},fS={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},pS={and:"AND",or:"OR"};class mS{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function Du(n,e){return n.useProto3Json||Gs(e)?e:{value:e}}function si(n,e){return n.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function L_(n,e){return n.useProto3Json?e.toBase64():e.toUint8Array()}function gS(n,e){return si(n,e.toTimestamp())}function Ae(n){return $(!!n,49232),z.fromTimestamp((function(t){const r=Ht(t);return new ne(r.seconds,r.nanos)})(n))}function Ll(n,e){return Nu(n,e).canonicalString()}function Nu(n,e){const t=(function(i){return new Q(["projects",i.projectId,"databases",i.database])})(n).child("documents");return e===void 0?t:t.child(e)}function M_(n){const e=Q.fromString(n);return $(K_(e),10190,{key:e.toString()}),e}function Ms(n,e){return Ll(n.databaseId,e.path)}function Ct(n,e){const t=M_(e);if(t.get(1)!==n.databaseId.projectId)throw new N(R.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+n.databaseId.projectId);if(t.get(3)!==n.databaseId.database)throw new N(R.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+n.databaseId.database);return new x(B_(t))}function F_(n,e){return Ll(n.databaseId,e)}function U_(n){const e=M_(n);return e.length===4?Q.emptyPath():B_(e)}function Vu(n){return new Q(["projects",n.databaseId.projectId,"databases",n.databaseId.database]).canonicalString()}function B_(n){return $(n.length>4&&n.get(4)==="documents",29091,{key:n.toString()}),n.popFirst(5)}function Wf(n,e,t){return{name:Ms(n,e),fields:t.value.mapValue.fields}}function Ya(n,e,t){const r=Ct(n,e.name),i=Ae(e.updateTime),s=e.createTime?Ae(e.createTime):z.min(),o=new Me({mapValue:{fields:e.fields}}),c=le.newFoundDocument(r,i,s,o);return t&&c.setHasCommittedMutations(),t?c.setHasCommittedMutations():c}function _S(n,e){return"found"in e?(function(r,i){$(!!i.found,43571),i.found.name,i.found.updateTime;const s=Ct(r,i.found.name),o=Ae(i.found.updateTime),c=i.found.createTime?Ae(i.found.createTime):z.min(),u=new Me({mapValue:{fields:i.found.fields}});return le.newFoundDocument(s,o,c,u)})(n,e):"missing"in e?(function(r,i){$(!!i.missing,3894),$(!!i.readTime,22933);const s=Ct(r,i.missing),o=Ae(i.readTime);return le.newNoDocument(s,o)})(n,e):q(7234,{result:e})}function yS(n,e){let t;if("targetChange"in e){e.targetChange;const r=(function(l){return l==="NO_CHANGE"?0:l==="ADD"?1:l==="REMOVE"?2:l==="CURRENT"?3:l==="RESET"?4:q(39313,{state:l})})(e.targetChange.targetChangeType||"NO_CHANGE"),i=e.targetChange.targetIds||[],s=(function(l,d){return l.useProto3Json?($(d===void 0||typeof d=="string",58123),ye.fromBase64String(d||"")):($(d===void 0||d instanceof Buffer||d instanceof Uint8Array,16193),ye.fromUint8Array(d||new Uint8Array))})(n,e.targetChange.resumeToken),o=e.targetChange.cause,c=o&&(function(l){const d=l.code===void 0?R.UNKNOWN:V_(l.code);return new N(d,l.message||"")})(o);t=new x_(r,i,s,c||null)}else if("documentChange"in e){e.documentChange;const r=e.documentChange;r.document,r.document.name,r.document.updateTime;const i=Ct(n,r.document.name),s=Ae(r.document.updateTime),o=r.document.createTime?Ae(r.document.createTime):z.min(),c=new Me({mapValue:{fields:r.document.fields}}),u=le.newFoundDocument(i,s,o,c),l=r.targetIds||[],d=r.removedTargetIds||[];t=new Ho(l,d,u.key,u)}else if("documentDelete"in e){e.documentDelete;const r=e.documentDelete;r.document;const i=Ct(n,r.document),s=r.readTime?Ae(r.readTime):z.min(),o=le.newNoDocument(i,s),c=r.removedTargetIds||[];t=new Ho([],c,o.key,o)}else if("documentRemove"in e){e.documentRemove;const r=e.documentRemove;r.document;const i=Ct(n,r.document),s=r.removedTargetIds||[];t=new Ho([],s,i,null)}else{if(!("filter"in e))return q(11601,{At:e});{e.filter;const r=e.filter;r.targetId;const{count:i=0,unchangedNames:s}=r,o=new uS(i,s),c=r.targetId;t=new O_(c,o)}}return t}function Fs(n,e){let t;if(e instanceof Ti)t={update:Wf(n,e.key,e.value)};else if(e instanceof Ei)t={delete:Ms(n,e.key)};else if(e instanceof tn)t={update:Wf(n,e.key,e.data),updateMask:AS(e.fieldMask)};else{if(!(e instanceof Dl))return q(16599,{Rt:e.type});t={verify:Ms(n,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map((r=>(function(s,o){const c=o.transform;if(c instanceof ri)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof cr)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof ur)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof ii)return{fieldPath:o.field.canonicalString(),increment:c.Ee};throw q(20930,{transform:o.transform})})(0,r)))),e.precondition.isNone||(t.currentDocument=(function(i,s){return s.updateTime!==void 0?{updateTime:gS(i,s.updateTime)}:s.exists!==void 0?{exists:s.exists}:q(27497)})(n,e.precondition)),t}function Ou(n,e){const t=e.currentDocument?(function(s){return s.updateTime!==void 0?ge.updateTime(Ae(s.updateTime)):s.exists!==void 0?ge.exists(s.exists):ge.none()})(e.currentDocument):ge.none(),r=e.updateTransforms?e.updateTransforms.map((i=>(function(o,c){let u=null;if("setToServerValue"in c)$(c.setToServerValue==="REQUEST_TIME",16630,{proto:c}),u=new ri;else if("appendMissingElements"in c){const d=c.appendMissingElements.values||[];u=new cr(d)}else if("removeAllFromArray"in c){const d=c.removeAllFromArray.values||[];u=new ur(d)}else"increment"in c?u=new ii(o,c.increment):q(16584,{proto:c});const l=he.fromServerFormat(c.fieldPath);return new Ys(l,u)})(n,i))):[];if(e.update){e.update.name;const i=Ct(n,e.update.name),s=new Me({mapValue:{fields:e.update.fields}});if(e.updateMask){const o=(function(u){const l=u.fieldPaths||[];return new Ze(l.map((d=>he.fromServerFormat(d))))})(e.updateMask);return new tn(i,s,o,t,r)}return new Ti(i,s,t,r)}if(e.delete){const i=Ct(n,e.delete);return new Ei(i,t)}if(e.verify){const i=Ct(n,e.verify);return new Dl(i,t)}return q(1463,{proto:e})}function IS(n,e){return n&&n.length>0?($(e!==void 0,14353),n.map((t=>(function(i,s){let o=i.updateTime?Ae(i.updateTime):Ae(s);return o.isEqual(z.min())&&(o=Ae(s)),new oS(o,i.transformResults||[])})(t,e)))):[]}function q_(n,e){return{documents:[F_(n,e.path)]}}function Ja(n,e){const t={structuredQuery:{}},r=e.path;let i;e.collectionGroup!==null?(i=r,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(i=r.popLast(),t.structuredQuery.from=[{collectionId:r.lastSegment()}]),t.parent=F_(n,i);const s=(function(l){if(l.length!==0)return G_(re.create(l,"and"))})(e.filters);s&&(t.structuredQuery.where=s);const o=(function(l){if(l.length!==0)return l.map((d=>(function(m){return{field:dn(m.field),direction:ES(m.dir)}})(d)))})(e.orderBy);o&&(t.structuredQuery.orderBy=o);const c=Du(n,e.limit);return c!==null&&(t.structuredQuery.limit=c),e.startAt&&(t.structuredQuery.startAt=(function(l){return{before:l.inclusive,values:l.position}})(e.startAt)),e.endAt&&(t.structuredQuery.endAt=(function(l){return{before:!l.inclusive,values:l.position}})(e.endAt)),{Vt:t,parent:i}}function j_(n,e,t,r){const{Vt:i,parent:s}=Ja(n,e),o={},c=[];let u=0;return t.forEach((l=>{const d=r?l.alias:"aggregate_"+u++;o[d]=l.alias,l.aggregateType==="count"?c.push({alias:d,count:{}}):l.aggregateType==="avg"?c.push({alias:d,avg:{field:dn(l.fieldPath)}}):l.aggregateType==="sum"&&c.push({alias:d,sum:{field:dn(l.fieldPath)}})})),{request:{structuredAggregationQuery:{aggregations:c,structuredQuery:i.structuredQuery},parent:i.parent},ft:o,parent:s}}function $_(n){let e=U_(n.parent);const t=n.structuredQuery,r=t.from?t.from.length:0;let i=null;if(r>0){$(r===1,65062);const d=t.from[0];d.allDescendants?i=d.collectionId:e=e.child(d.collectionId)}let s=[];t.where&&(s=(function(p){const m=z_(p);return m instanceof re&&Sl(m)?m.getFilters():[m]})(t.where));let o=[];t.orderBy&&(o=(function(p){return p.map((m=>(function(P){return new Ls(Fr(P.field),(function(k){switch(k){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}})(P.direction))})(m)))})(t.orderBy));let c=null;t.limit&&(c=(function(p){let m;return m=typeof p=="object"?p.value:p,Gs(m)?null:m})(t.limit));let u=null;t.startAt&&(u=(function(p){const m=!!p.before,T=p.values||[];return new Sn(T,m)})(t.startAt));let l=null;return t.endAt&&(l=(function(p){const m=!p.before,T=p.values||[];return new Sn(T,m)})(t.endAt)),p_(e,i,o,s,c,"F",u,l)}function TS(n,e){const t=(function(i){switch(i){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return q(28987,{purpose:i})}})(e.purpose);return t==null?null:{"goog-listen-tags":t}}function z_(n){return n.unaryFilter!==void 0?(function(t){switch(t.unaryFilter.op){case"IS_NAN":const r=Fr(t.unaryFilter.field);return Z.create(r,"==",{doubleValue:NaN});case"IS_NULL":const i=Fr(t.unaryFilter.field);return Z.create(i,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const s=Fr(t.unaryFilter.field);return Z.create(s,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Fr(t.unaryFilter.field);return Z.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return q(61313);default:return q(60726)}})(n):n.fieldFilter!==void 0?(function(t){return Z.create(Fr(t.fieldFilter.field),(function(i){switch(i){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return q(58110);default:return q(50506)}})(t.fieldFilter.op),t.fieldFilter.value)})(n):n.compositeFilter!==void 0?(function(t){return re.create(t.compositeFilter.filters.map((r=>z_(r))),(function(i){switch(i){case"AND":return"and";case"OR":return"or";default:return q(1026)}})(t.compositeFilter.op))})(n):q(30097,{filter:n})}function ES(n){return dS[n]}function vS(n){return fS[n]}function wS(n){return pS[n]}function dn(n){return{fieldPath:n.canonicalString()}}function Fr(n){return he.fromServerFormat(n.fieldPath)}function G_(n){return n instanceof Z?(function(t){if(t.op==="=="){if(Df(t.value))return{unaryFilter:{field:dn(t.field),op:"IS_NAN"}};if(kf(t.value))return{unaryFilter:{field:dn(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(Df(t.value))return{unaryFilter:{field:dn(t.field),op:"IS_NOT_NAN"}};if(kf(t.value))return{unaryFilter:{field:dn(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:dn(t.field),op:vS(t.op),value:t.value}}})(n):n instanceof re?(function(t){const r=t.getFilters().map((i=>G_(i)));return r.length===1?r[0]:{compositeFilter:{op:wS(t.op),filters:r}}})(n):q(54877,{filter:n})}function AS(n){const e=[];return n.fields.forEach((t=>e.push(t.canonicalString()))),{fieldPaths:e}}function K_(n){return n.length>=4&&n.get(0)==="projects"&&n.get(2)==="databases"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jt{constructor(e,t,r,i,s=z.min(),o=z.min(),c=ye.EMPTY_BYTE_STRING,u=null){this.target=e,this.targetId=t,this.purpose=r,this.sequenceNumber=i,this.snapshotVersion=s,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=c,this.expectedCount=u}withSequenceNumber(e){return new jt(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new jt(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new jt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new jt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class W_{constructor(e){this.gt=e}}function bS(n,e){let t;if(e.document)t=Ya(n.gt,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const r=x.fromSegments(e.noDocument.path),i=hr(e.noDocument.readTime);t=le.newNoDocument(r,i),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return q(56709);{const r=x.fromSegments(e.unknownDocument.path),i=hr(e.unknownDocument.version);t=le.newUnknownDocument(r,i)}}return e.readTime&&t.setReadTime((function(i){const s=new ne(i[0],i[1]);return z.fromTimestamp(s)})(e.readTime)),t}function Hf(n,e){const t=e.key,r={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:fa(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())r.document=(function(s,o){return{name:Ms(s,o.key),fields:o.data.value.mapValue.fields,updateTime:si(s,o.version.toTimestamp()),createTime:si(s,o.createTime.toTimestamp())}})(n.gt,e);else if(e.isNoDocument())r.noDocument={path:t.path.toArray(),readTime:lr(e.version)};else{if(!e.isUnknownDocument())return q(57904,{document:e});r.unknownDocument={path:t.path.toArray(),version:lr(e.version)}}return r}function fa(n){const e=n.toTimestamp();return[e.seconds,e.nanoseconds]}function lr(n){const e=n.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function hr(n){const e=new ne(n.seconds,n.nanoseconds);return z.fromTimestamp(e)}function Qn(n,e){const t=(e.baseMutations||[]).map((s=>Ou(n.gt,s)));for(let s=0;s<e.mutations.length-1;++s){const o=e.mutations[s];if(s+1<e.mutations.length&&e.mutations[s+1].transform!==void 0){const c=e.mutations[s+1];o.updateTransforms=c.transform.fieldTransforms,e.mutations.splice(s+1,1),++s}}const r=e.mutations.map((s=>Ou(n.gt,s))),i=ne.fromMillis(e.localWriteTimeMs);return new Nl(e.batchId,i,t,r)}function os(n){const e=hr(n.readTime),t=n.lastLimboFreeSnapshotVersion!==void 0?hr(n.lastLimboFreeSnapshotVersion):z.min();let r;return r=(function(s){return s.documents!==void 0})(n.query)?(function(s){const o=s.documents.length;return $(o===1,1966,{count:o}),Ge(Ii(U_(s.documents[0])))})(n.query):(function(s){return Ge($_(s))})(n.query),new jt(r,n.targetId,"TargetPurposeListen",n.lastListenSequenceNumber,e,t,ye.fromBase64String(n.resumeToken))}function H_(n,e){const t=lr(e.snapshotVersion),r=lr(e.lastLimboFreeSnapshotVersion);let i;i=ua(e.target)?q_(n.gt,e.target):Ja(n.gt,e.target).Vt;const s=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:ar(e.target),readTime:t,resumeToken:s,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:r,query:i}}function Xa(n){const e=$_({parent:n.parent,structuredQuery:n.structuredQuery});return n.limitType==="LAST"?ha(e,e.limit,"L"):e}function Yc(n,e){return new Ol(e.largestBatchId,Ou(n.gt,e.overlayMutation))}function Qf(n,e){const t=e.path.lastSegment();return[n,ze(e.path.popLast()),t]}function Yf(n,e,t,r){return{indexId:n,uid:e,sequenceNumber:t,readTime:lr(r.readTime),documentKey:ze(r.documentKey.path),largestBatchId:r.largestBatchId}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class RS{getBundleMetadata(e,t){return Jf(e).get(t).next((r=>{if(r)return(function(s){return{id:s.bundleId,createTime:hr(s.createTime),version:s.version}})(r)}))}saveBundleMetadata(e,t){return Jf(e).put((function(i){return{bundleId:i.id,createTime:lr(Ae(i.createTime)),version:i.version}})(t))}getNamedQuery(e,t){return Xf(e).get(t).next((r=>{if(r)return(function(s){return{name:s.name,query:Xa(s.bundledQuery),readTime:hr(s.readTime)}})(r)}))}saveNamedQuery(e,t){return Xf(e).put((function(i){return{name:i.name,readTime:lr(Ae(i.readTime)),bundledQuery:i.bundledQuery}})(t))}}function Jf(n){return ke(n,ja)}function Xf(n){return ke(n,$a)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Za{constructor(e,t){this.serializer=e,this.userId=t}static yt(e,t){const r=t.uid||"";return new Za(e,r)}getOverlay(e,t){return Hi(e).get(Qf(this.userId,t)).next((r=>r?Yc(this.serializer,r):null))}getOverlays(e,t){const r=Rt();return A.forEach(t,(i=>this.getOverlay(e,i).next((s=>{s!==null&&r.set(i,s)})))).next((()=>r))}saveOverlays(e,t,r){const i=[];return r.forEach(((s,o)=>{const c=new Ol(t,o);i.push(this.wt(e,c))})),A.waitFor(i)}removeOverlaysForBatchId(e,t,r){const i=new Set;t.forEach((o=>i.add(ze(o.getCollectionPath()))));const s=[];return i.forEach((o=>{const c=IDBKeyRange.bound([this.userId,o,r],[this.userId,o,r+1],!1,!0);s.push(Hi(e).Y(wu,c))})),A.waitFor(s)}getOverlaysForCollection(e,t,r){const i=Rt(),s=ze(t),o=IDBKeyRange.bound([this.userId,s,r],[this.userId,s,Number.POSITIVE_INFINITY],!0);return Hi(e).j(wu,o).next((c=>{for(const u of c){const l=Yc(this.serializer,u);i.set(l.getKey(),l)}return i}))}getOverlaysForCollectionGroup(e,t,r,i){const s=Rt();let o;const c=IDBKeyRange.bound([this.userId,t,r],[this.userId,t,Number.POSITIVE_INFINITY],!0);return Hi(e).X({index:Gg,range:c},((u,l,d)=>{const p=Yc(this.serializer,l);s.size()<i||p.largestBatchId===o?(s.set(p.getKey(),p),o=p.largestBatchId):d.done()})).next((()=>s))}wt(e,t){return Hi(e).put((function(i,s,o){const[c,u,l]=Qf(s,o.mutation.key);return{userId:s,collectionPath:u,documentId:l,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:Fs(i.gt,o.mutation)}})(this.serializer,this.userId,t))}}function Hi(n){return ke(n,za)}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class SS{St(e){return ke(e,wl)}getSessionToken(e){return this.St(e).get("sessionToken").next((t=>{const r=t==null?void 0:t.value;return r?ye.fromUint8Array(r):ye.EMPTY_BYTE_STRING}))}setSessionToken(e,t){return this.St(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yn{constructor(){}bt(e,t){this.Dt(e,t),t.vt()}Dt(e,t){if("nullValue"in e)this.Ct(t,5);else if("booleanValue"in e)this.Ct(t,10),t.Ft(e.booleanValue?1:0);else if("integerValue"in e)this.Ct(t,15),t.Ft(pe(e.integerValue));else if("doubleValue"in e){const r=pe(e.doubleValue);isNaN(r)?this.Ct(t,13):(this.Ct(t,15),Ps(r)?t.Ft(0):t.Ft(r))}else if("timestampValue"in e){let r=e.timestampValue;this.Ct(t,20),typeof r=="string"&&(r=Ht(r)),t.Mt(`${r.seconds||""}`),t.Ft(r.nanos||0)}else if("stringValue"in e)this.xt(e.stringValue,t),this.Ot(t);else if("bytesValue"in e)this.Ct(t,30),t.Nt(Qt(e.bytesValue)),this.Ot(t);else if("referenceValue"in e)this.Bt(e.referenceValue,t);else if("geoPointValue"in e){const r=e.geoPointValue;this.Ct(t,45),t.Ft(r.latitude||0),t.Ft(r.longitude||0)}else"mapValue"in e?i_(e)?this.Ct(t,Number.MAX_SAFE_INTEGER):Wa(e)?this.Lt(e.mapValue,t):(this.kt(e.mapValue,t),this.Ot(t)):"arrayValue"in e?(this.qt(e.arrayValue,t),this.Ot(t)):q(19022,{Qt:e})}xt(e,t){this.Ct(t,25),this.$t(e,t)}$t(e,t){t.Mt(e)}kt(e,t){const r=e.fields||{};this.Ct(t,55);for(const i of Object.keys(r))this.xt(i,t),this.Dt(r[i],t)}Lt(e,t){var r,i;const s=e.fields||{};this.Ct(t,53);const o=ei,c=((i=(r=s[o].arrayValue)===null||r===void 0?void 0:r.values)===null||i===void 0?void 0:i.length)||0;this.Ct(t,15),t.Ft(pe(c)),this.xt(o,t),this.Dt(s[o],t)}qt(e,t){const r=e.values||[];this.Ct(t,50);for(const i of r)this.Dt(i,t)}Bt(e,t){this.Ct(t,37),x.fromName(e).path.forEach((r=>{this.Ct(t,60),this.$t(r,t)}))}Ct(e,t){e.Ft(t)}Ot(e){e.Ft(2)}}Yn.Ut=new Yn;/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law | agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES | CONDITIONS OF ANY KIND, either express | implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Nr=255;function PS(n){if(n===0)return 8;let e=0;return n>>4||(e+=4,n<<=4),n>>6||(e+=2,n<<=2),n>>7||(e+=1),e}function Zf(n){const e=64-(function(r){let i=0;for(let s=0;s<8;++s){const o=PS(255&r[s]);if(i+=o,o!==8)break}return i})(n);return Math.ceil(e/8)}class CS{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Kt(e){const t=e[Symbol.iterator]();let r=t.next();for(;!r.done;)this.Wt(r.value),r=t.next();this.Gt()}zt(e){const t=e[Symbol.iterator]();let r=t.next();for(;!r.done;)this.jt(r.value),r=t.next();this.Jt()}Ht(e){for(const t of e){const r=t.charCodeAt(0);if(r<128)this.Wt(r);else if(r<2048)this.Wt(960|r>>>6),this.Wt(128|63&r);else if(t<"\uD800"||"\uDBFF"<t)this.Wt(480|r>>>12),this.Wt(128|63&r>>>6),this.Wt(128|63&r);else{const i=t.codePointAt(0);this.Wt(240|i>>>18),this.Wt(128|63&i>>>12),this.Wt(128|63&i>>>6),this.Wt(128|63&i)}}this.Gt()}Yt(e){for(const t of e){const r=t.charCodeAt(0);if(r<128)this.jt(r);else if(r<2048)this.jt(960|r>>>6),this.jt(128|63&r);else if(t<"\uD800"||"\uDBFF"<t)this.jt(480|r>>>12),this.jt(128|63&r>>>6),this.jt(128|63&r);else{const i=t.codePointAt(0);this.jt(240|i>>>18),this.jt(128|63&i>>>12),this.jt(128|63&i>>>6),this.jt(128|63&i)}}this.Jt()}Zt(e){const t=this.Xt(e),r=Zf(t);this.en(1+r),this.buffer[this.position++]=255&r;for(let i=t.length-r;i<t.length;++i)this.buffer[this.position++]=255&t[i]}tn(e){const t=this.Xt(e),r=Zf(t);this.en(1+r),this.buffer[this.position++]=~(255&r);for(let i=t.length-r;i<t.length;++i)this.buffer[this.position++]=~(255&t[i])}nn(){this.rn(Nr),this.rn(255)}sn(){this._n(Nr),this._n(255)}reset(){this.position=0}seed(e){this.en(e.length),this.buffer.set(e,this.position),this.position+=e.length}an(){return this.buffer.slice(0,this.position)}Xt(e){const t=(function(s){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,s,!1),new Uint8Array(o.buffer)})(e),r=!!(128&t[0]);t[0]^=r?255:128;for(let i=1;i<t.length;++i)t[i]^=r?255:0;return t}Wt(e){const t=255&e;t===0?(this.rn(0),this.rn(255)):t===Nr?(this.rn(Nr),this.rn(0)):this.rn(t)}jt(e){const t=255&e;t===0?(this._n(0),this._n(255)):t===Nr?(this._n(Nr),this._n(0)):this._n(e)}Gt(){this.rn(0),this.rn(1)}Jt(){this._n(0),this._n(1)}rn(e){this.en(1),this.buffer[this.position++]=e}_n(e){this.en(1),this.buffer[this.position++]=~e}en(e){const t=e+this.position;if(t<=this.buffer.length)return;let r=2*this.buffer.length;r<t&&(r=t);const i=new Uint8Array(r);i.set(this.buffer),this.buffer=i}}class kS{constructor(e){this.un=e}Nt(e){this.un.Kt(e)}Mt(e){this.un.Ht(e)}Ft(e){this.un.Zt(e)}vt(){this.un.nn()}}class DS{constructor(e){this.un=e}Nt(e){this.un.zt(e)}Mt(e){this.un.Yt(e)}Ft(e){this.un.tn(e)}vt(){this.un.sn()}}class Qi{constructor(){this.un=new CS,this.cn=new kS(this.un),this.ln=new DS(this.un)}seed(e){this.un.seed(e)}hn(e){return e===0?this.cn:this.ln}an(){return this.un.an()}reset(){this.un.reset()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jn{constructor(e,t,r,i){this.Pn=e,this.Tn=t,this.In=r,this.dn=i}En(){const e=this.dn.length,t=e===0||this.dn[e-1]===255?e+1:e,r=new Uint8Array(t);return r.set(this.dn,0),t!==e?r.set([0],this.dn.length):++r[r.length-1],new Jn(this.Pn,this.Tn,this.In,r)}An(e,t,r){return{indexId:this.Pn,uid:e,arrayValue:Qo(this.In),directionalValue:Qo(this.dn),orderedDocumentKey:Qo(t),documentKey:r.path.toArray()}}Rn(e,t,r){const i=this.An(e,t,r);return[i.indexId,i.uid,i.arrayValue,i.directionalValue,i.orderedDocumentKey,i.documentKey]}}function un(n,e){let t=n.Pn-e.Pn;return t!==0?t:(t=ep(n.In,e.In),t!==0?t:(t=ep(n.dn,e.dn),t!==0?t:x.comparator(n.Tn,e.Tn)))}function ep(n,e){for(let t=0;t<n.length&&t<e.length;++t){const r=n[t]-e[t];if(r!==0)return r}return n.length-e.length}function Qo(n){return um()?(function(t){let r="";for(let i=0;i<t.length;i++)r+=String.fromCharCode(t[i]);return r})(n):n}function tp(n){return typeof n!="string"?n:(function(t){const r=new Uint8Array(t.length);for(let i=0;i<t.length;i++)r[i]=t.charCodeAt(i);return r})(n)}class np{constructor(e){this.Vn=new se(((t,r)=>he.comparator(t.field,r.field))),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.mn=e.orderBy,this.fn=[];for(const t of e.filters){const r=t;r.isInequality()?this.Vn=this.Vn.add(r):this.fn.push(r)}}get gn(){return this.Vn.size>1}pn(e){if($(e.collectionGroup===this.collectionId,49279),this.gn)return!1;const t=Tu(e);if(t!==void 0&&!this.yn(t))return!1;const r=Kn(e);let i=new Set,s=0,o=0;for(;s<r.length&&this.yn(r[s]);++s)i=i.add(r[s].fieldPath.canonicalString());if(s===r.length)return!0;if(this.Vn.size>0){const c=this.Vn.getIterator().getNext();if(!i.has(c.field.canonicalString())){const u=r[s];if(!this.wn(c,u)||!this.Sn(this.mn[o++],u))return!1}++s}for(;s<r.length;++s){const c=r[s];if(o>=this.mn.length||!this.Sn(this.mn[o++],c))return!1}return!0}bn(){if(this.gn)return null;let e=new se(he.comparator);const t=[];for(const r of this.fn)if(!r.field.isKeyField())if(r.op==="array-contains"||r.op==="array-contains-any")t.push(new nr(r.field,2));else{if(e.has(r.field))continue;e=e.add(r.field),t.push(new nr(r.field,0))}for(const r of this.mn)r.field.isKeyField()||e.has(r.field)||(e=e.add(r.field),t.push(new nr(r.field,r.dir==="asc"?0:1)));return new Hr(Hr.UNKNOWN_ID,this.collectionId,t,Qr.empty())}yn(e){for(const t of this.fn)if(this.wn(t,e))return!0;return!1}wn(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const r=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===r}Sn(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Q_(n){var e,t;if($(n instanceof Z||n instanceof re,20012),n instanceof Z){if(n instanceof f_){const i=((t=(e=n.value.arrayValue)===null||e===void 0?void 0:e.values)===null||t===void 0?void 0:t.map((s=>Z.create(n.field,"==",s))))||[];return re.create(i,"or")}return n}const r=n.filters.map((i=>Q_(i)));return re.create(r,n.op)}function NS(n){if(n.getFilters().length===0)return[];const e=Mu(Q_(n));return $(Y_(e),7391),xu(e)||Lu(e)?[e]:e.getFilters()}function xu(n){return n instanceof Z}function Lu(n){return n instanceof re&&Sl(n)}function Y_(n){return xu(n)||Lu(n)||(function(t){if(t instanceof re&&Su(t)){for(const r of t.getFilters())if(!xu(r)&&!Lu(r))return!1;return!0}return!1})(n)}function Mu(n){if($(n instanceof Z||n instanceof re,34018),n instanceof Z)return n;if(n.filters.length===1)return Mu(n.filters[0]);const e=n.filters.map((r=>Mu(r)));let t=re.create(e,n.op);return t=pa(t),Y_(t)?t:($(t instanceof re,64498),$(ni(t),40251),$(t.filters.length>1,57927),t.filters.reduce(((r,i)=>Ml(r,i))))}function Ml(n,e){let t;return $(n instanceof Z||n instanceof re,38388),$(e instanceof Z||e instanceof re,25473),t=n instanceof Z?e instanceof Z?(function(i,s){return re.create([i,s],"and")})(n,e):rp(n,e):e instanceof Z?rp(e,n):(function(i,s){if($(i.filters.length>0&&s.filters.length>0,48005),ni(i)&&ni(s))return l_(i,s.getFilters());const o=Su(i)?i:s,c=Su(i)?s:i,u=o.filters.map((l=>Ml(l,c)));return re.create(u,"or")})(n,e),pa(t)}function rp(n,e){if(ni(e))return l_(e,n.getFilters());{const t=e.filters.map((r=>Ml(n,r)));return re.create(t,"or")}}function pa(n){if($(n instanceof Z||n instanceof re,11850),n instanceof Z)return n;const e=n.getFilters();if(e.length===1)return pa(e[0]);if(c_(n))return n;const t=e.map((i=>pa(i))),r=[];return t.forEach((i=>{i instanceof Z?r.push(i):i instanceof re&&(i.op===n.op?r.push(...i.filters):r.push(i))})),r.length===1?r[0]:re.create(r,n.op)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class VS{constructor(){this.Dn=new Fl}addToCollectionParentIndex(e,t){return this.Dn.add(t),A.resolve()}getCollectionParents(e,t){return A.resolve(this.Dn.getEntries(t))}addFieldIndex(e,t){return A.resolve()}deleteFieldIndex(e,t){return A.resolve()}deleteAllFieldIndexes(e){return A.resolve()}createTargetIndexes(e,t){return A.resolve()}getDocumentsMatchingTarget(e,t){return A.resolve(null)}getIndexType(e,t){return A.resolve(0)}getFieldIndexes(e,t){return A.resolve([])}getNextCollectionGroupToUpdate(e){return A.resolve(null)}getMinOffset(e,t){return A.resolve(lt.min())}getMinOffsetFromCollectionGroup(e,t){return A.resolve(lt.min())}updateCollectionGroup(e,t,r){return A.resolve()}updateIndexEntries(e,t){return A.resolve()}}class Fl{constructor(){this.index={}}add(e){const t=e.lastSegment(),r=e.popLast(),i=this.index[t]||new se(Q.comparator),s=!i.has(r);return this.index[t]=i.add(r),s}has(e){const t=e.lastSegment(),r=e.popLast(),i=this.index[t];return i&&i.has(r)}getEntries(e){return(this.index[e]||new se(Q.comparator)).toArray()}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ip="IndexedDbIndexManager",ko=new Uint8Array(0);class OS{constructor(e,t){this.databaseId=t,this.vn=new Fl,this.Cn=new en((r=>ar(r)),((r,i)=>Ws(r,i))),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.vn.has(t)){const r=t.lastSegment(),i=t.popLast();e.addOnCommittedListener((()=>{this.vn.add(t)}));const s={collectionId:r,parent:ze(i)};return sp(e).put(s)}return A.resolve()}getCollectionParents(e,t){const r=[],i=IDBKeyRange.bound([t,""],[kg(t),""],!1,!0);return sp(e).j(i).next((s=>{for(const o of s){if(o.collectionId!==t)break;r.push(bt(o.parent))}return r}))}addFieldIndex(e,t){const r=Yi(e),i=(function(c){return{indexId:c.indexId,collectionGroup:c.collectionGroup,fields:c.fields.map((u=>[u.fieldPath.canonicalString(),u.kind]))}})(t);delete i.indexId;const s=r.add(i);if(t.indexState){const o=Or(e);return s.next((c=>{o.put(Yf(c,this.uid,t.indexState.sequenceNumber,t.indexState.offset))}))}return s.next()}deleteFieldIndex(e,t){const r=Yi(e),i=Or(e),s=Vr(e);return r.delete(t.indexId).next((()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))).next((()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))))}deleteAllFieldIndexes(e){const t=Yi(e),r=Vr(e),i=Or(e);return t.Y().next((()=>r.Y())).next((()=>i.Y()))}createTargetIndexes(e,t){return A.forEach(this.Fn(t),(r=>this.getIndexType(e,r).next((i=>{if(i===0||i===1){const s=new np(r).bn();if(s!=null)return this.addFieldIndex(e,s)}}))))}getDocumentsMatchingTarget(e,t){const r=Vr(e);let i=!0;const s=new Map;return A.forEach(this.Fn(t),(o=>this.Mn(e,o).next((c=>{i&&(i=!!c),s.set(o,c)})))).next((()=>{if(i){let o=H();const c=[];return A.forEach(s,((u,l)=>{V(ip,`Using index ${(function(M){return`id=${M.indexId}|cg=${M.collectionGroup}|f=${M.fields.map((G=>`${G.fieldPath}:${G.kind}`)).join(",")}`})(u)} to execute ${ar(t)}`);const d=(function(M,G){const J=Tu(G);if(J===void 0)return null;for(const W of la(M,J.fieldPath))switch(W.op){case"array-contains-any":return W.value.arrayValue.values||[];case"array-contains":return[W.value]}return null})(l,u),p=(function(M,G){const J=new Map;for(const W of Kn(G))for(const E of la(M,W.fieldPath))switch(E.op){case"==":case"in":J.set(W.fieldPath.canonicalString(),E.value);break;case"not-in":case"!=":return J.set(W.fieldPath.canonicalString(),E.value),Array.from(J.values())}return null})(l,u),m=(function(M,G){const J=[];let W=!0;for(const E of Kn(G)){const _=E.kind===0?Lf(M,E.fieldPath,M.startAt):Mf(M,E.fieldPath,M.startAt);J.push(_.value),W&&(W=_.inclusive)}return new Sn(J,W)})(l,u),T=(function(M,G){const J=[];let W=!0;for(const E of Kn(G)){const _=E.kind===0?Mf(M,E.fieldPath,M.endAt):Lf(M,E.fieldPath,M.endAt);J.push(_.value),W&&(W=_.inclusive)}return new Sn(J,W)})(l,u),P=this.xn(u,l,m),D=this.xn(u,l,T),k=this.On(u,l,p),U=this.Nn(u.indexId,d,P,m.inclusive,D,T.inclusive,k);return A.forEach(U,(B=>r.H(B,t.limit).next((M=>{M.forEach((G=>{const J=x.fromSegments(G.documentKey);o.has(J)||(o=o.add(J),c.push(J))}))}))))})).next((()=>c))}return A.resolve(null)}))}Fn(e){let t=this.Cn.get(e);return t||(e.filters.length===0?t=[e]:t=NS(re.create(e.filters,"and")).map((r=>Cu(e.path,e.collectionGroup,e.orderBy,r.getFilters(),e.limit,e.startAt,e.endAt))),this.Cn.set(e,t),t)}Nn(e,t,r,i,s,o,c){const u=(t!=null?t.length:1)*Math.max(r.length,s.length),l=u/(t!=null?t.length:1),d=[];for(let p=0;p<u;++p){const m=t?this.Bn(t[p/l]):ko,T=this.Ln(e,m,r[p%l],i),P=this.kn(e,m,s[p%l],o),D=c.map((k=>this.Ln(e,m,k,!0)));d.push(...this.createRange(T,P,D))}return d}Ln(e,t,r,i){const s=new Jn(e,x.empty(),t,r);return i?s:s.En()}kn(e,t,r,i){const s=new Jn(e,x.empty(),t,r);return i?s.En():s}Mn(e,t){const r=new np(t),i=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,i).next((s=>{let o=null;for(const c of s)r.pn(c)&&(!o||c.fields.length>o.fields.length)&&(o=c);return o}))}getIndexType(e,t){let r=2;const i=this.Fn(t);return A.forEach(i,(s=>this.Mn(e,s).next((o=>{o?r!==0&&o.fields.length<(function(u){let l=new se(he.comparator),d=!1;for(const p of u.filters)for(const m of p.getFlattenedFilters())m.field.isKeyField()||(m.op==="array-contains"||m.op==="array-contains-any"?d=!0:l=l.add(m.field));for(const p of u.orderBy)p.field.isKeyField()||(l=l.add(p.field));return l.size+(d?1:0)})(s)&&(r=1):r=0})))).next((()=>(function(o){return o.limit!==null})(t)&&i.length>1&&r===2?1:r))}qn(e,t){const r=new Qi;for(const i of Kn(e)){const s=t.data.field(i.fieldPath);if(s==null)return null;const o=r.hn(i.kind);Yn.Ut.bt(s,o)}return r.an()}Bn(e){const t=new Qi;return Yn.Ut.bt(e,t.hn(0)),t.an()}Qn(e,t){const r=new Qi;return Yn.Ut.bt(or(this.databaseId,t),r.hn((function(s){const o=Kn(s);return o.length===0?0:o[o.length-1].kind})(e))),r.an()}On(e,t,r){if(r===null)return[];let i=[];i.push(new Qi);let s=0;for(const o of Kn(e)){const c=r[s++];for(const u of i)if(this.$n(t,o.fieldPath)&&xs(c))i=this.Un(i,o,c);else{const l=u.hn(o.kind);Yn.Ut.bt(c,l)}}return this.Kn(i)}xn(e,t,r){return this.On(e,t,r.position)}Kn(e){const t=[];for(let r=0;r<e.length;++r)t[r]=e[r].an();return t}Un(e,t,r){const i=[...e],s=[];for(const o of r.arrayValue.values||[])for(const c of i){const u=new Qi;u.seed(c.an()),Yn.Ut.bt(o,u.hn(t.kind)),s.push(u)}return s}$n(e,t){return!!e.filters.find((r=>r instanceof Z&&r.field.isEqual(t)&&(r.op==="in"||r.op==="not-in")))}getFieldIndexes(e,t){const r=Yi(e),i=Or(e);return(t?r.j(vu,IDBKeyRange.bound(t,t)):r.j()).next((s=>{const o=[];return A.forEach(s,(c=>i.get([c.indexId,this.uid]).next((u=>{o.push((function(d,p){const m=p?new Qr(p.sequenceNumber,new lt(hr(p.readTime),new x(bt(p.documentKey)),p.largestBatchId)):Qr.empty(),T=d.fields.map((([P,D])=>new nr(he.fromServerFormat(P),D)));return new Hr(d.indexId,d.collectionGroup,T,m)})(c,u))})))).next((()=>o))}))}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next((t=>t.length===0?null:(t.sort(((r,i)=>{const s=r.indexState.sequenceNumber-i.indexState.sequenceNumber;return s!==0?s:K(r.collectionGroup,i.collectionGroup)})),t[0].collectionGroup)))}updateCollectionGroup(e,t,r){const i=Yi(e),s=Or(e);return this.Wn(e).next((o=>i.j(vu,IDBKeyRange.bound(t,t)).next((c=>A.forEach(c,(u=>s.put(Yf(u.indexId,this.uid,o,r))))))))}updateIndexEntries(e,t){const r=new Map;return A.forEach(t,((i,s)=>{const o=r.get(i.collectionGroup);return(o?A.resolve(o):this.getFieldIndexes(e,i.collectionGroup)).next((c=>(r.set(i.collectionGroup,c),A.forEach(c,(u=>this.Gn(e,i,u).next((l=>{const d=this.zn(s,u);return l.isEqual(d)?A.resolve():this.jn(e,s,u,l,d)})))))))}))}Jn(e,t,r,i){return Vr(e).put(i.An(this.uid,this.Qn(r,t.key),t.key))}Hn(e,t,r,i){return Vr(e).delete(i.Rn(this.uid,this.Qn(r,t.key),t.key))}Gn(e,t,r){const i=Vr(e);let s=new se(un);return i.X({index:zg,range:IDBKeyRange.only([r.indexId,this.uid,Qo(this.Qn(r,t))])},((o,c)=>{s=s.add(new Jn(r.indexId,t,tp(c.arrayValue),tp(c.directionalValue)))})).next((()=>s))}zn(e,t){let r=new se(un);const i=this.qn(t,e);if(i==null)return r;const s=Tu(t);if(s!=null){const o=e.data.field(s.fieldPath);if(xs(o))for(const c of o.arrayValue.values||[])r=r.add(new Jn(t.indexId,e.key,this.Bn(c),i))}else r=r.add(new Jn(t.indexId,e.key,ko,i));return r}jn(e,t,r,i,s){V(ip,"Updating index entries for document '%s'",t.key);const o=[];return(function(u,l,d,p,m){const T=u.getIterator(),P=l.getIterator();let D=Dr(T),k=Dr(P);for(;D||k;){let U=!1,B=!1;if(D&&k){const M=d(D,k);M<0?B=!0:M>0&&(U=!0)}else D!=null?B=!0:U=!0;U?(p(k),k=Dr(P)):B?(m(D),D=Dr(T)):(D=Dr(T),k=Dr(P))}})(i,s,un,(c=>{o.push(this.Jn(e,t,r,c))}),(c=>{o.push(this.Hn(e,t,r,c))})),A.waitFor(o)}Wn(e){let t=1;return Or(e).X({index:$g,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},((r,i,s)=>{s.done(),t=i.sequenceNumber+1})).next((()=>t))}createRange(e,t,r){r=r.sort(((o,c)=>un(o,c))).filter(((o,c,u)=>!c||un(o,u[c-1])!==0));const i=[];i.push(e);for(const o of r){const c=un(o,e),u=un(o,t);if(c===0)i[0]=e.En();else if(c>0&&u<0)i.push(o),i.push(o.En());else if(u>0)break}i.push(t);const s=[];for(let o=0;o<i.length;o+=2){if(this.Yn(i[o],i[o+1]))return[];const c=i[o].Rn(this.uid,ko,x.empty()),u=i[o+1].Rn(this.uid,ko,x.empty());s.push(IDBKeyRange.bound(c,u))}return s}Yn(e,t){return un(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(op)}getMinOffset(e,t){return A.mapArray(this.Fn(t),(r=>this.Mn(e,r).next((i=>i||q(44426))))).next(op)}}function sp(n){return ke(n,Ds)}function Vr(n){return ke(n,ms)}function Yi(n){return ke(n,vl)}function Or(n){return ke(n,ps)}function op(n){$(n.length!==0,28825);let e=n[0].indexState.offset,t=e.largestBatchId;for(let r=1;r<n.length;r++){const i=n[r].indexState.offset;Il(i,e)<0&&(e=i),t<i.largestBatchId&&(t=i.largestBatchId)}return new lt(e.readTime,e.documentKey,t)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ap={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},J_=41943040;class $e{static withCacheSize(e){return new $e(e,$e.DEFAULT_COLLECTION_PERCENTILE,$e.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,r){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=r}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function X_(n,e,t){const r=n.store(_t),i=n.store(Yr),s=[],o=IDBKeyRange.only(t.batchId);let c=0;const u=r.X({range:o},((d,p,m)=>(c++,m.delete())));s.push(u.next((()=>{$(c===1,47070,{batchId:t.batchId})})));const l=[];for(const d of t.mutations){const p=Bg(e,d.key.path,t.batchId);s.push(i.delete(p)),l.push(d.key)}return A.waitFor(s).next((()=>l))}function ma(n){if(!n)return 0;let e;if(n.document)e=n.document;else if(n.unknownDocument)e=n.unknownDocument;else{if(!n.noDocument)throw q(14731);e=n.noDocument}return JSON.stringify(e).length}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */$e.DEFAULT_COLLECTION_PERCENTILE=10,$e.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,$e.DEFAULT=new $e(J_,$e.DEFAULT_COLLECTION_PERCENTILE,$e.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),$e.DISABLED=new $e(-1,0,0);class ec{constructor(e,t,r,i){this.userId=e,this.serializer=t,this.indexManager=r,this.referenceDelegate=i,this.Zn={}}static yt(e,t,r,i){$(e.uid!=="",64387);const s=e.isAuthenticated()?e.uid:"";return new ec(s,t,r,i)}checkEmpty(e){let t=!0;const r=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return ln(e).X({index:Zn,range:r},((i,s,o)=>{t=!1,o.done()})).next((()=>t))}addMutationBatch(e,t,r,i){const s=Ur(e),o=ln(e);return o.add({}).next((c=>{$(typeof c=="number",49019);const u=new Nl(c,t,r,i),l=(function(T,P,D){const k=D.baseMutations.map((B=>Fs(T.gt,B))),U=D.mutations.map((B=>Fs(T.gt,B)));return{userId:P,batchId:D.batchId,localWriteTimeMs:D.localWriteTime.toMillis(),baseMutations:k,mutations:U}})(this.serializer,this.userId,u),d=[];let p=new se(((m,T)=>K(m.canonicalString(),T.canonicalString())));for(const m of i){const T=Bg(this.userId,m.key.path,c);p=p.add(m.key.path.popLast()),d.push(o.put(l)),d.push(s.put(T,mR))}return p.forEach((m=>{d.push(this.indexManager.addToCollectionParentIndex(e,m))})),e.addOnCommittedListener((()=>{this.Zn[c]=u.keys()})),A.waitFor(d).next((()=>u))}))}lookupMutationBatch(e,t){return ln(e).get(t).next((r=>r?($(r.userId===this.userId,48,"Unexpected user for mutation batch",{userId:r.userId,batchId:t}),Qn(this.serializer,r)):null))}Xn(e,t){return this.Zn[t]?A.resolve(this.Zn[t]):this.lookupMutationBatch(e,t).next((r=>{if(r){const i=r.keys();return this.Zn[t]=i,i}return null}))}getNextMutationBatchAfterBatchId(e,t){const r=t+1,i=IDBKeyRange.lowerBound([this.userId,r]);let s=null;return ln(e).X({index:Zn,range:i},((o,c,u)=>{c.userId===this.userId&&($(c.batchId>=r,47524,{er:r}),s=Qn(this.serializer,c)),u.done()})).next((()=>s))}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let r=vn;return ln(e).X({index:Zn,range:t,reverse:!0},((i,s,o)=>{r=s.batchId,o.done()})).next((()=>r))}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,vn],[this.userId,Number.POSITIVE_INFINITY]);return ln(e).j(Zn,t).next((r=>r.map((i=>Qn(this.serializer,i)))))}getAllMutationBatchesAffectingDocumentKey(e,t){const r=jo(this.userId,t.path),i=IDBKeyRange.lowerBound(r),s=[];return Ur(e).X({range:i},((o,c,u)=>{const[l,d,p]=o,m=bt(d);if(l===this.userId&&t.path.isEqual(m))return ln(e).get(p).next((T=>{if(!T)throw q(61480,{tr:o,batchId:p});$(T.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:T.userId,batchId:p}),s.push(Qn(this.serializer,T))}));u.done()})).next((()=>s))}getAllMutationBatchesAffectingDocumentKeys(e,t){let r=new se(K);const i=[];return t.forEach((s=>{const o=jo(this.userId,s.path),c=IDBKeyRange.lowerBound(o),u=Ur(e).X({range:c},((l,d,p)=>{const[m,T,P]=l,D=bt(T);m===this.userId&&s.path.isEqual(D)?r=r.add(P):p.done()}));i.push(u)})),A.waitFor(i).next((()=>this.nr(e,r)))}getAllMutationBatchesAffectingQuery(e,t){const r=t.path,i=r.length+1,s=jo(this.userId,r),o=IDBKeyRange.lowerBound(s);let c=new se(K);return Ur(e).X({range:o},((u,l,d)=>{const[p,m,T]=u,P=bt(m);p===this.userId&&r.isPrefixOf(P)?P.length===i&&(c=c.add(T)):d.done()})).next((()=>this.nr(e,c)))}nr(e,t){const r=[],i=[];return t.forEach((s=>{i.push(ln(e).get(s).next((o=>{if(o===null)throw q(35274,{batchId:s});$(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:s}),r.push(Qn(this.serializer,o))})))})),A.waitFor(i).next((()=>r))}removeMutationBatch(e,t){return X_(e.ce,this.userId,t).next((r=>(e.addOnCommittedListener((()=>{this.rr(t.batchId)})),A.forEach(r,(i=>this.referenceDelegate.markPotentiallyOrphaned(e,i))))))}rr(e){delete this.Zn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next((t=>{if(!t)return A.resolve();const r=IDBKeyRange.lowerBound((function(o){return[o]})(this.userId)),i=[];return Ur(e).X({range:r},((s,o,c)=>{if(s[0]===this.userId){const u=bt(s[1]);i.push(u)}else c.done()})).next((()=>{$(i.length===0,56720,{ir:i.map((s=>s.canonicalString()))})}))}))}containsKey(e,t){return Z_(e,this.userId,t)}sr(e){return ey(e).get(this.userId).next((t=>t||{userId:this.userId,lastAcknowledgedBatchId:vn,lastStreamToken:""}))}}function Z_(n,e,t){const r=jo(e,t.path),i=r[1],s=IDBKeyRange.lowerBound(r);let o=!1;return Ur(n).X({range:s,Z:!0},((c,u,l)=>{const[d,p,m]=c;d===e&&p===i&&(o=!0),l.done()})).next((()=>o))}function ln(n){return ke(n,_t)}function Ur(n){return ke(n,Yr)}function ey(n){return ke(n,Cs)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dr{constructor(e){this._r=e}next(){return this._r+=2,this._r}static ar(){return new dr(0)}static ur(){return new dr(-1)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xS{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.cr(e).next((t=>{const r=new dr(t.highestTargetId);return t.highestTargetId=r.next(),this.lr(e,t).next((()=>t.highestTargetId))}))}getLastRemoteSnapshotVersion(e){return this.cr(e).next((t=>z.fromTimestamp(new ne(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds))))}getHighestSequenceNumber(e){return this.cr(e).next((t=>t.highestListenSequenceNumber))}setTargetsMetadata(e,t,r){return this.cr(e).next((i=>(i.highestListenSequenceNumber=t,r&&(i.lastRemoteSnapshotVersion=r.toTimestamp()),t>i.highestListenSequenceNumber&&(i.highestListenSequenceNumber=t),this.lr(e,i))))}addTargetData(e,t){return this.hr(e,t).next((()=>this.cr(e).next((r=>(r.targetCount+=1,this.Pr(t,r),this.lr(e,r))))))}updateTargetData(e,t){return this.hr(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next((()=>xr(e).delete(t.targetId))).next((()=>this.cr(e))).next((r=>($(r.targetCount>0,8065),r.targetCount-=1,this.lr(e,r))))}removeTargets(e,t,r){let i=0;const s=[];return xr(e).X(((o,c)=>{const u=os(c);u.sequenceNumber<=t&&r.get(u.targetId)===null&&(i++,s.push(this.removeTargetData(e,u)))})).next((()=>A.waitFor(s))).next((()=>i))}forEachTarget(e,t){return xr(e).X(((r,i)=>{const s=os(i);t(s)}))}cr(e){return cp(e).get(ca).next((t=>($(t!==null,2888),t)))}lr(e,t){return cp(e).put(ca,t)}hr(e,t){return xr(e).put(H_(this.serializer,t))}Pr(e,t){let r=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,r=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,r=!0),r}getTargetCount(e){return this.cr(e).next((t=>t.targetCount))}getTargetData(e,t){const r=ar(t),i=IDBKeyRange.bound([r,Number.NEGATIVE_INFINITY],[r,Number.POSITIVE_INFINITY]);let s=null;return xr(e).X({range:i,index:jg},((o,c,u)=>{const l=os(c);Ws(t,l.target)&&(s=l,u.done())})).next((()=>s))}addMatchingKeys(e,t,r){const i=[],s=fn(e);return t.forEach((o=>{const c=ze(o.path);i.push(s.put({targetId:r,path:c})),i.push(this.referenceDelegate.addReference(e,r,o))})),A.waitFor(i)}removeMatchingKeys(e,t,r){const i=fn(e);return A.forEach(t,(s=>{const o=ze(s.path);return A.waitFor([i.delete([r,o]),this.referenceDelegate.removeReference(e,r,s)])}))}removeMatchingKeysForTargetId(e,t){const r=fn(e),i=IDBKeyRange.bound([t],[t+1],!1,!0);return r.delete(i)}getMatchingKeysForTargetId(e,t){const r=IDBKeyRange.bound([t],[t+1],!1,!0),i=fn(e);let s=H();return i.X({range:r,Z:!0},((o,c,u)=>{const l=bt(o[1]),d=new x(l);s=s.add(d)})).next((()=>s))}containsKey(e,t){const r=ze(t.path),i=IDBKeyRange.bound([r],[kg(r)],!1,!0);let s=0;return fn(e).X({index:El,Z:!0,range:i},(([o,c],u,l)=>{o!==0&&(s++,l.done())})).next((()=>s>0))}Et(e,t){return xr(e).get(t).next((r=>r?os(r):null))}}function xr(n){return ke(n,Jr)}function cp(n){return ke(n,rr)}function fn(n){return ke(n,Xr)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const up="LruGarbageCollector",ty=1048576;function lp([n,e],[t,r]){const i=K(n,t);return i===0?K(e,r):i}class LS{constructor(e){this.Tr=e,this.buffer=new se(lp),this.Ir=0}dr(){return++this.Ir}Er(e){const t=[e,this.dr()];if(this.buffer.size<this.Tr)this.buffer=this.buffer.add(t);else{const r=this.buffer.last();lp(t,r)<0&&(this.buffer=this.buffer.delete(r).add(t))}}get maxValue(){return this.buffer.last()[0]}}class ny{constructor(e,t,r){this.garbageCollector=e,this.asyncQueue=t,this.localStore=r,this.Ar=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Rr(6e4)}stop(){this.Ar&&(this.Ar.cancel(),this.Ar=null)}get started(){return this.Ar!==null}Rr(e){V(up,`Garbage collection scheduled in ${e}ms`),this.Ar=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,(async()=>{this.Ar=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){Vn(t)?V(up,"Ignoring IndexedDB error during garbage collection: ",t):await Nn(t)}await this.Rr(3e5)}))}}class MS{constructor(e,t){this.Vr=e,this.params=t}calculateTargetCount(e,t){return this.Vr.mr(e).next((r=>Math.floor(t/100*r)))}nthSequenceNumber(e,t){if(t===0)return A.resolve(Xe.ue);const r=new LS(t);return this.Vr.forEachTarget(e,(i=>r.Er(i.sequenceNumber))).next((()=>this.Vr.gr(e,(i=>r.Er(i))))).next((()=>r.maxValue))}removeTargets(e,t,r){return this.Vr.removeTargets(e,t,r)}removeOrphanedDocuments(e,t){return this.Vr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(V("LruGarbageCollector","Garbage collection skipped; disabled"),A.resolve(ap)):this.getCacheSize(e).next((r=>r<this.params.cacheSizeCollectionThreshold?(V("LruGarbageCollector",`Garbage collection skipped; Cache size ${r} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),ap):this.pr(e,t)))}getCacheSize(e){return this.Vr.getCacheSize(e)}pr(e,t){let r,i,s,o,c,u,l;const d=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next((p=>(p>this.params.maximumSequenceNumbersToCollect?(V("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${p}`),i=this.params.maximumSequenceNumbersToCollect):i=p,o=Date.now(),this.nthSequenceNumber(e,i)))).next((p=>(r=p,c=Date.now(),this.removeTargets(e,r,t)))).next((p=>(s=p,u=Date.now(),this.removeOrphanedDocuments(e,r)))).next((p=>(l=Date.now(),Lr()<=X.DEBUG&&V("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-d}ms
	Determined least recently used ${i} in `+(c-o)+`ms
	Removed ${s} targets in `+(u-c)+`ms
	Removed ${p} documents in `+(l-u)+`ms
Total Duration: ${l-d}ms`),A.resolve({didRun:!0,sequenceNumbersCollected:i,targetsRemoved:s,documentsRemoved:p}))))}}function ry(n,e){return new MS(n,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class FS{constructor(e,t){this.db=e,this.garbageCollector=ry(this,t)}mr(e){const t=this.yr(e);return this.db.getTargetCache().getTargetCount(e).next((r=>t.next((i=>r+i))))}yr(e){let t=0;return this.gr(e,(r=>{t++})).next((()=>t))}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}gr(e,t){return this.wr(e,((r,i)=>t(i)))}addReference(e,t,r){return Do(e,r)}removeReference(e,t,r){return Do(e,r)}removeTargets(e,t,r){return this.db.getTargetCache().removeTargets(e,t,r)}markPotentiallyOrphaned(e,t){return Do(e,t)}Sr(e,t){return(function(i,s){let o=!1;return ey(i).ee((c=>Z_(i,c,s).next((u=>(u&&(o=!0),A.resolve(!u)))))).next((()=>o))})(e,t)}removeOrphanedDocuments(e,t){const r=this.db.getRemoteDocumentCache().newChangeBuffer(),i=[];let s=0;return this.wr(e,((o,c)=>{if(c<=t){const u=this.Sr(e,o).next((l=>{if(!l)return s++,r.getEntry(e,o).next((()=>(r.removeEntry(o,z.min()),fn(e).delete((function(p){return[0,ze(p.path)]})(o)))))}));i.push(u)}})).next((()=>A.waitFor(i))).next((()=>r.apply(e))).next((()=>s))}removeTarget(e,t){const r=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,r)}updateLimboDocument(e,t){return Do(e,t)}wr(e,t){const r=fn(e);let i,s=Xe.ue;return r.X({index:El},(([o,c],{path:u,sequenceNumber:l})=>{o===0?(s!==Xe.ue&&t(new x(bt(i)),s),s=l,i=u):s=Xe.ue})).next((()=>{s!==Xe.ue&&t(new x(bt(i)),s)}))}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function Do(n,e){return fn(n).put((function(r,i){return{targetId:0,path:ze(r.path),sequenceNumber:i}})(e,n.currentSequenceNumber))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iy{constructor(){this.changes=new en((e=>e.toString()),((e,t)=>e.isEqual(t))),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,le.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const r=this.changes.get(t);return r!==void 0?A.resolve(r):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class US{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,r){return zn(e).put(r)}removeEntry(e,t,r){return zn(e).delete((function(s,o){const c=s.path.toArray();return[c.slice(0,c.length-2),c[c.length-2],fa(o),c[c.length-1]]})(t,r))}updateMetadata(e,t){return this.getMetadata(e).next((r=>(r.byteSize+=t,this.br(e,r))))}getEntry(e,t){let r=le.newInvalidDocument(t);return zn(e).X({index:$o,range:IDBKeyRange.only(Ji(t))},((i,s)=>{r=this.Dr(t,s)})).next((()=>r))}vr(e,t){let r={size:0,document:le.newInvalidDocument(t)};return zn(e).X({index:$o,range:IDBKeyRange.only(Ji(t))},((i,s)=>{r={document:this.Dr(t,s),size:ma(s)}})).next((()=>r))}getEntries(e,t){let r=et();return this.Cr(e,t,((i,s)=>{const o=this.Dr(i,s);r=r.insert(i,o)})).next((()=>r))}Fr(e,t){let r=et(),i=new ce(x.comparator);return this.Cr(e,t,((s,o)=>{const c=this.Dr(s,o);r=r.insert(s,c),i=i.insert(s,ma(o))})).next((()=>({documents:r,Mr:i})))}Cr(e,t,r){if(t.isEmpty())return A.resolve();let i=new se(fp);t.forEach((u=>i=i.add(u)));const s=IDBKeyRange.bound(Ji(i.first()),Ji(i.last())),o=i.getIterator();let c=o.getNext();return zn(e).X({index:$o,range:s},((u,l,d)=>{const p=x.fromSegments([...l.prefixPath,l.collectionGroup,l.documentId]);for(;c&&fp(c,p)<0;)r(c,null),c=o.getNext();c&&c.isEqual(p)&&(r(c,l),c=o.hasNext()?o.getNext():null),c?d.G(Ji(c)):d.done()})).next((()=>{for(;c;)r(c,null),c=o.hasNext()?o.getNext():null}))}getDocumentsMatchingQuery(e,t,r,i,s){const o=t.path,c=[o.popLast().toArray(),o.lastSegment(),fa(r.readTime),r.documentKey.path.isEmpty()?"":r.documentKey.path.lastSegment()],u=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return zn(e).j(IDBKeyRange.bound(c,u,!0)).next((l=>{s==null||s.incrementDocumentReadCount(l.length);let d=et();for(const p of l){const m=this.Dr(x.fromSegments(p.prefixPath.concat(p.collectionGroup,p.documentId)),p);m.isFoundDocument()&&(Qs(t,m)||i.has(m.key))&&(d=d.insert(m.key,m))}return d}))}getAllFromCollectionGroup(e,t,r,i){let s=et();const o=dp(t,r),c=dp(t,lt.max());return zn(e).X({index:qg,range:IDBKeyRange.bound(o,c,!0)},((u,l,d)=>{const p=this.Dr(x.fromSegments(l.prefixPath.concat(l.collectionGroup,l.documentId)),l);s=s.insert(p.key,p),s.size===i&&d.done()})).next((()=>s))}newChangeBuffer(e){return new BS(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next((t=>t.byteSize))}getMetadata(e){return hp(e).get(Eu).next((t=>($(!!t,20021),t)))}br(e,t){return hp(e).put(Eu,t)}Dr(e,t){if(t){const r=bS(this.serializer,t);if(!(r.isNoDocument()&&r.version.isEqual(z.min())))return r}return le.newInvalidDocument(e)}}function sy(n){return new US(n)}class BS extends iy{constructor(e,t){super(),this.Or=e,this.trackRemovals=t,this.Nr=new en((r=>r.toString()),((r,i)=>r.isEqual(i)))}applyChanges(e){const t=[];let r=0,i=new se(((s,o)=>K(s.canonicalString(),o.canonicalString())));return this.changes.forEach(((s,o)=>{const c=this.Nr.get(s);if(t.push(this.Or.removeEntry(e,s,c.readTime)),o.isValidDocument()){const u=Hf(this.Or.serializer,o);i=i.add(s.path.popLast());const l=ma(u);r+=l-c.size,t.push(this.Or.addEntry(e,s,u))}else if(r-=c.size,this.trackRemovals){const u=Hf(this.Or.serializer,o.convertToNoDocument(z.min()));t.push(this.Or.addEntry(e,s,u))}})),i.forEach((s=>{t.push(this.Or.indexManager.addToCollectionParentIndex(e,s))})),t.push(this.Or.updateMetadata(e,r)),A.waitFor(t)}getFromCache(e,t){return this.Or.vr(e,t).next((r=>(this.Nr.set(t,{size:r.size,readTime:r.document.readTime}),r.document)))}getAllFromCache(e,t){return this.Or.Fr(e,t).next((({documents:r,Mr:i})=>(i.forEach(((s,o)=>{this.Nr.set(s,{size:o,readTime:r.get(s).readTime})})),r)))}}function hp(n){return ke(n,ks)}function zn(n){return ke(n,aa)}function Ji(n){const e=n.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function dp(n,e){const t=e.documentKey.path.toArray();return[n,fa(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function fp(n,e){const t=n.path.toArray(),r=e.path.toArray();let i=0;for(let s=0;s<t.length-2&&s<r.length-2;++s)if(i=K(t[s],r[s]),i)return i;return i=K(t.length,r.length),i||(i=K(t[t.length-2],r[r.length-2]),i||K(t[t.length-1],r[r.length-1]))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qS{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oy{constructor(e,t,r,i){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=r,this.indexManager=i}getDocument(e,t){let r=null;return this.documentOverlayCache.getOverlay(e,t).next((i=>(r=i,this.remoteDocumentCache.getEntry(e,t)))).next((i=>(r!==null&&ys(r.mutation,i,Ze.empty(),ne.now()),i)))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next((r=>this.getLocalViewOfDocuments(e,r,H()).next((()=>r))))}getLocalViewOfDocuments(e,t,r=H()){const i=Rt();return this.populateOverlays(e,i,t).next((()=>this.computeViews(e,t,i,r).next((s=>{let o=is();return s.forEach(((c,u)=>{o=o.insert(c,u.overlayedDocument)})),o}))))}getOverlayedDocuments(e,t){const r=Rt();return this.populateOverlays(e,r,t).next((()=>this.computeViews(e,t,r,H())))}populateOverlays(e,t,r){const i=[];return r.forEach((s=>{t.has(s)||i.push(s)})),this.documentOverlayCache.getOverlays(e,i).next((s=>{s.forEach(((o,c)=>{t.set(o,c)}))}))}computeViews(e,t,r,i){let s=et();const o=_s(),c=(function(){return _s()})();return t.forEach(((u,l)=>{const d=r.get(l.key);i.has(l.key)&&(d===void 0||d.mutation instanceof tn)?s=s.insert(l.key,l):d!==void 0?(o.set(l.key,d.mutation.getFieldMask()),ys(d.mutation,l,d.mutation.getFieldMask(),ne.now())):o.set(l.key,Ze.empty())})),this.recalculateAndSaveOverlays(e,s).next((u=>(u.forEach(((l,d)=>o.set(l,d))),t.forEach(((l,d)=>{var p;return c.set(l,new qS(d,(p=o.get(l))!==null&&p!==void 0?p:null))})),c)))}recalculateAndSaveOverlays(e,t){const r=_s();let i=new ce(((o,c)=>o-c)),s=H();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next((o=>{for(const c of o)c.keys().forEach((u=>{const l=t.get(u);if(l===null)return;let d=r.get(u)||Ze.empty();d=c.applyToLocalView(l,d),r.set(u,d);const p=(i.get(c.batchId)||H()).add(u);i=i.insert(c.batchId,p)}))})).next((()=>{const o=[],c=i.getReverseIterator();for(;c.hasNext();){const u=c.getNext(),l=u.key,d=u.value,p=v_();d.forEach((m=>{if(!s.has(m)){const T=C_(t.get(m),r.get(m));T!==null&&p.set(m,T),s=s.add(m)}})),o.push(this.documentOverlayCache.saveOverlays(e,l,p))}return A.waitFor(o)})).next((()=>r))}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next((r=>this.recalculateAndSaveOverlays(e,r)))}getDocumentsMatchingQuery(e,t,r,i){return(function(o){return x.isDocumentKey(o.path)&&o.collectionGroup===null&&o.filters.length===0})(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):Pl(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,r,i):this.getDocumentsMatchingCollectionQuery(e,t,r,i)}getNextDocuments(e,t,r,i){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,r,i).next((s=>{const o=i-s.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,r.largestBatchId,i-s.size):A.resolve(Rt());let c=Wr,u=s;return o.next((l=>A.forEach(l,((d,p)=>(c<p.largestBatchId&&(c=p.largestBatchId),s.get(d)?A.resolve():this.remoteDocumentCache.getEntry(e,d).next((m=>{u=u.insert(d,m)}))))).next((()=>this.populateOverlays(e,l,s))).next((()=>this.computeViews(e,u,l,H()))).next((d=>({batchId:c,changes:E_(d)})))))}))}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new x(t)).next((r=>{let i=is();return r.isFoundDocument()&&(i=i.insert(r.key,r)),i}))}getDocumentsMatchingCollectionGroupQuery(e,t,r,i){const s=t.collectionGroup;let o=is();return this.indexManager.getCollectionParents(e,s).next((c=>A.forEach(c,(u=>{const l=(function(p,m){return new Zt(m,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt)})(t,u.child(s));return this.getDocumentsMatchingCollectionQuery(e,l,r,i).next((d=>{d.forEach(((p,m)=>{o=o.insert(p,m)}))}))})).next((()=>o))))}getDocumentsMatchingCollectionQuery(e,t,r,i){let s;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,r.largestBatchId).next((o=>(s=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,r,s,i)))).next((o=>{s.forEach(((u,l)=>{const d=l.getKey();o.get(d)===null&&(o=o.insert(d,le.newInvalidDocument(d)))}));let c=is();return o.forEach(((u,l)=>{const d=s.get(u);d!==void 0&&ys(d.mutation,l,Ze.empty(),ne.now()),Qs(t,l)&&(c=c.insert(u,l))})),c}))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jS{constructor(e){this.serializer=e,this.Br=new Map,this.Lr=new Map}getBundleMetadata(e,t){return A.resolve(this.Br.get(t))}saveBundleMetadata(e,t){return this.Br.set(t.id,(function(i){return{id:i.id,version:i.version,createTime:Ae(i.createTime)}})(t)),A.resolve()}getNamedQuery(e,t){return A.resolve(this.Lr.get(t))}saveNamedQuery(e,t){return this.Lr.set(t.name,(function(i){return{name:i.name,query:Xa(i.bundledQuery),readTime:Ae(i.readTime)}})(t)),A.resolve()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $S{constructor(){this.overlays=new ce(x.comparator),this.kr=new Map}getOverlay(e,t){return A.resolve(this.overlays.get(t))}getOverlays(e,t){const r=Rt();return A.forEach(t,(i=>this.getOverlay(e,i).next((s=>{s!==null&&r.set(i,s)})))).next((()=>r))}saveOverlays(e,t,r){return r.forEach(((i,s)=>{this.wt(e,t,s)})),A.resolve()}removeOverlaysForBatchId(e,t,r){const i=this.kr.get(r);return i!==void 0&&(i.forEach((s=>this.overlays=this.overlays.remove(s))),this.kr.delete(r)),A.resolve()}getOverlaysForCollection(e,t,r){const i=Rt(),s=t.length+1,o=new x(t.child("")),c=this.overlays.getIteratorFrom(o);for(;c.hasNext();){const u=c.getNext().value,l=u.getKey();if(!t.isPrefixOf(l.path))break;l.path.length===s&&u.largestBatchId>r&&i.set(u.getKey(),u)}return A.resolve(i)}getOverlaysForCollectionGroup(e,t,r,i){let s=new ce(((l,d)=>l-d));const o=this.overlays.getIterator();for(;o.hasNext();){const l=o.getNext().value;if(l.getKey().getCollectionGroup()===t&&l.largestBatchId>r){let d=s.get(l.largestBatchId);d===null&&(d=Rt(),s=s.insert(l.largestBatchId,d)),d.set(l.getKey(),l)}}const c=Rt(),u=s.getIterator();for(;u.hasNext()&&(u.getNext().value.forEach(((l,d)=>c.set(l,d))),!(c.size()>=i)););return A.resolve(c)}wt(e,t,r){const i=this.overlays.get(r.key);if(i!==null){const o=this.kr.get(i.largestBatchId).delete(r.key);this.kr.set(i.largestBatchId,o)}this.overlays=this.overlays.insert(r.key,new Ol(t,r));let s=this.kr.get(t);s===void 0&&(s=H(),this.kr.set(t,s)),this.kr.set(t,s.add(r.key))}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zS{constructor(){this.sessionToken=ye.EMPTY_BYTE_STRING}getSessionToken(e){return A.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,A.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ul{constructor(){this.qr=new se(De.Qr),this.$r=new se(De.Ur)}isEmpty(){return this.qr.isEmpty()}addReference(e,t){const r=new De(e,t);this.qr=this.qr.add(r),this.$r=this.$r.add(r)}Kr(e,t){e.forEach((r=>this.addReference(r,t)))}removeReference(e,t){this.Wr(new De(e,t))}Gr(e,t){e.forEach((r=>this.removeReference(r,t)))}zr(e){const t=new x(new Q([])),r=new De(t,e),i=new De(t,e+1),s=[];return this.$r.forEachInRange([r,i],(o=>{this.Wr(o),s.push(o.key)})),s}jr(){this.qr.forEach((e=>this.Wr(e)))}Wr(e){this.qr=this.qr.delete(e),this.$r=this.$r.delete(e)}Jr(e){const t=new x(new Q([])),r=new De(t,e),i=new De(t,e+1);let s=H();return this.$r.forEachInRange([r,i],(o=>{s=s.add(o.key)})),s}containsKey(e){const t=new De(e,0),r=this.qr.firstAfterOrEqual(t);return r!==null&&e.isEqual(r.key)}}class De{constructor(e,t){this.key=e,this.Hr=t}static Qr(e,t){return x.comparator(e.key,t.key)||K(e.Hr,t.Hr)}static Ur(e,t){return K(e.Hr,t.Hr)||x.comparator(e.key,t.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class GS{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.er=1,this.Yr=new se(De.Qr)}checkEmpty(e){return A.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,r,i){const s=this.er;this.er++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new Nl(s,t,r,i);this.mutationQueue.push(o);for(const c of i)this.Yr=this.Yr.add(new De(c.key,s)),this.indexManager.addToCollectionParentIndex(e,c.key.path.popLast());return A.resolve(o)}lookupMutationBatch(e,t){return A.resolve(this.Zr(t))}getNextMutationBatchAfterBatchId(e,t){const r=t+1,i=this.Xr(r),s=i<0?0:i;return A.resolve(this.mutationQueue.length>s?this.mutationQueue[s]:null)}getHighestUnacknowledgedBatchId(){return A.resolve(this.mutationQueue.length===0?vn:this.er-1)}getAllMutationBatches(e){return A.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const r=new De(t,0),i=new De(t,Number.POSITIVE_INFINITY),s=[];return this.Yr.forEachInRange([r,i],(o=>{const c=this.Zr(o.Hr);s.push(c)})),A.resolve(s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let r=new se(K);return t.forEach((i=>{const s=new De(i,0),o=new De(i,Number.POSITIVE_INFINITY);this.Yr.forEachInRange([s,o],(c=>{r=r.add(c.Hr)}))})),A.resolve(this.ei(r))}getAllMutationBatchesAffectingQuery(e,t){const r=t.path,i=r.length+1;let s=r;x.isDocumentKey(s)||(s=s.child(""));const o=new De(new x(s),0);let c=new se(K);return this.Yr.forEachWhile((u=>{const l=u.key.path;return!!r.isPrefixOf(l)&&(l.length===i&&(c=c.add(u.Hr)),!0)}),o),A.resolve(this.ei(c))}ei(e){const t=[];return e.forEach((r=>{const i=this.Zr(r);i!==null&&t.push(i)})),t}removeMutationBatch(e,t){$(this.ti(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let r=this.Yr;return A.forEach(t.mutations,(i=>{const s=new De(i.key,t.batchId);return r=r.delete(s),this.referenceDelegate.markPotentiallyOrphaned(e,i.key)})).next((()=>{this.Yr=r}))}rr(e){}containsKey(e,t){const r=new De(t,0),i=this.Yr.firstAfterOrEqual(r);return A.resolve(t.isEqual(i&&i.key))}performConsistencyCheck(e){return this.mutationQueue.length,A.resolve()}ti(e,t){return this.Xr(e)}Xr(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Zr(e){const t=this.Xr(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class KS{constructor(e){this.ni=e,this.docs=(function(){return new ce(x.comparator)})(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const r=t.key,i=this.docs.get(r),s=i?i.size:0,o=this.ni(t);return this.docs=this.docs.insert(r,{document:t.mutableCopy(),size:o}),this.size+=o-s,this.indexManager.addToCollectionParentIndex(e,r.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const r=this.docs.get(t);return A.resolve(r?r.document.mutableCopy():le.newInvalidDocument(t))}getEntries(e,t){let r=et();return t.forEach((i=>{const s=this.docs.get(i);r=r.insert(i,s?s.document.mutableCopy():le.newInvalidDocument(i))})),A.resolve(r)}getDocumentsMatchingQuery(e,t,r,i){let s=et();const o=t.path,c=new x(o.child("__id-9223372036854775808__")),u=this.docs.getIteratorFrom(c);for(;u.hasNext();){const{key:l,value:{document:d}}=u.getNext();if(!o.isPrefixOf(l.path))break;l.path.length>o.length+1||Il(xg(d),r)<=0||(i.has(d.key)||Qs(t,d))&&(s=s.insert(d.key,d.mutableCopy()))}return A.resolve(s)}getAllFromCollectionGroup(e,t,r,i){q(9500)}ri(e,t){return A.forEach(this.docs,(r=>t(r)))}newChangeBuffer(e){return new WS(this)}getSize(e){return A.resolve(this.size)}}class WS extends iy{constructor(e){super(),this.Or=e}applyChanges(e){const t=[];return this.changes.forEach(((r,i)=>{i.isValidDocument()?t.push(this.Or.addEntry(e,i)):this.Or.removeEntry(r)})),A.waitFor(t)}getFromCache(e,t){return this.Or.getEntry(e,t)}getAllFromCache(e,t){return this.Or.getEntries(e,t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class HS{constructor(e){this.persistence=e,this.ii=new en((t=>ar(t)),Ws),this.lastRemoteSnapshotVersion=z.min(),this.highestTargetId=0,this.si=0,this.oi=new Ul,this.targetCount=0,this._i=dr.ar()}forEachTarget(e,t){return this.ii.forEach(((r,i)=>t(i))),A.resolve()}getLastRemoteSnapshotVersion(e){return A.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return A.resolve(this.si)}allocateTargetId(e){return this.highestTargetId=this._i.next(),A.resolve(this.highestTargetId)}setTargetsMetadata(e,t,r){return r&&(this.lastRemoteSnapshotVersion=r),t>this.si&&(this.si=t),A.resolve()}hr(e){this.ii.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this._i=new dr(t),this.highestTargetId=t),e.sequenceNumber>this.si&&(this.si=e.sequenceNumber)}addTargetData(e,t){return this.hr(t),this.targetCount+=1,A.resolve()}updateTargetData(e,t){return this.hr(t),A.resolve()}removeTargetData(e,t){return this.ii.delete(t.target),this.oi.zr(t.targetId),this.targetCount-=1,A.resolve()}removeTargets(e,t,r){let i=0;const s=[];return this.ii.forEach(((o,c)=>{c.sequenceNumber<=t&&r.get(c.targetId)===null&&(this.ii.delete(o),s.push(this.removeMatchingKeysForTargetId(e,c.targetId)),i++)})),A.waitFor(s).next((()=>i))}getTargetCount(e){return A.resolve(this.targetCount)}getTargetData(e,t){const r=this.ii.get(t)||null;return A.resolve(r)}addMatchingKeys(e,t,r){return this.oi.Kr(t,r),A.resolve()}removeMatchingKeys(e,t,r){this.oi.Gr(t,r);const i=this.persistence.referenceDelegate,s=[];return i&&t.forEach((o=>{s.push(i.markPotentiallyOrphaned(e,o))})),A.waitFor(s)}removeMatchingKeysForTargetId(e,t){return this.oi.zr(t),A.resolve()}getMatchingKeysForTargetId(e,t){const r=this.oi.Jr(t);return A.resolve(r)}containsKey(e,t){return A.resolve(this.oi.containsKey(t))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bl{constructor(e,t){this.ai={},this.overlays={},this.ui=new Xe(0),this.ci=!1,this.ci=!0,this.li=new zS,this.referenceDelegate=e(this),this.hi=new HS(this),this.indexManager=new VS,this.remoteDocumentCache=(function(i){return new KS(i)})((r=>this.referenceDelegate.Pi(r))),this.serializer=new W_(t),this.Ti=new jS(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.ci=!1,Promise.resolve()}get started(){return this.ci}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new $S,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let r=this.ai[e.toKey()];return r||(r=new GS(t,this.referenceDelegate),this.ai[e.toKey()]=r),r}getGlobalsCache(){return this.li}getTargetCache(){return this.hi}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Ti}runTransaction(e,t,r){V("MemoryPersistence","Starting transaction:",e);const i=new QS(this.ui.next());return this.referenceDelegate.Ii(),r(i).next((s=>this.referenceDelegate.di(i).next((()=>s)))).toPromise().then((s=>(i.raiseOnCommittedEvent(),s)))}Ei(e,t){return A.or(Object.values(this.ai).map((r=>()=>r.containsKey(e,t))))}}class QS extends Mg{constructor(e){super(),this.currentSequenceNumber=e}}class tc{constructor(e){this.persistence=e,this.Ai=new Ul,this.Ri=null}static Vi(e){return new tc(e)}get mi(){if(this.Ri)return this.Ri;throw q(60996)}addReference(e,t,r){return this.Ai.addReference(r,t),this.mi.delete(r.toString()),A.resolve()}removeReference(e,t,r){return this.Ai.removeReference(r,t),this.mi.add(r.toString()),A.resolve()}markPotentiallyOrphaned(e,t){return this.mi.add(t.toString()),A.resolve()}removeTarget(e,t){this.Ai.zr(t.targetId).forEach((i=>this.mi.add(i.toString())));const r=this.persistence.getTargetCache();return r.getMatchingKeysForTargetId(e,t.targetId).next((i=>{i.forEach((s=>this.mi.add(s.toString())))})).next((()=>r.removeTargetData(e,t)))}Ii(){this.Ri=new Set}di(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return A.forEach(this.mi,(r=>{const i=x.fromPath(r);return this.fi(e,i).next((s=>{s||t.removeEntry(i,z.min())}))})).next((()=>(this.Ri=null,t.apply(e))))}updateLimboDocument(e,t){return this.fi(e,t).next((r=>{r?this.mi.delete(t.toString()):this.mi.add(t.toString())}))}Pi(e){return 0}fi(e,t){return A.or([()=>A.resolve(this.Ai.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Ei(e,t)])}}class ga{constructor(e,t){this.persistence=e,this.gi=new en((r=>ze(r.path)),((r,i)=>r.isEqual(i))),this.garbageCollector=ry(this,t)}static Vi(e,t){return new ga(e,t)}Ii(){}di(e){return A.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}mr(e){const t=this.yr(e);return this.persistence.getTargetCache().getTargetCount(e).next((r=>t.next((i=>r+i))))}yr(e){let t=0;return this.gr(e,(r=>{t++})).next((()=>t))}gr(e,t){return A.forEach(this.gi,((r,i)=>this.Sr(e,r,i).next((s=>s?A.resolve():t(i)))))}removeTargets(e,t,r){return this.persistence.getTargetCache().removeTargets(e,t,r)}removeOrphanedDocuments(e,t){let r=0;const i=this.persistence.getRemoteDocumentCache(),s=i.newChangeBuffer();return i.ri(e,(o=>this.Sr(e,o,t).next((c=>{c||(r++,s.removeEntry(o,z.min()))})))).next((()=>s.apply(e))).next((()=>r))}markPotentiallyOrphaned(e,t){return this.gi.set(t,e.currentSequenceNumber),A.resolve()}removeTarget(e,t){const r=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,r)}addReference(e,t,r){return this.gi.set(r,e.currentSequenceNumber),A.resolve()}removeReference(e,t,r){return this.gi.set(r,e.currentSequenceNumber),A.resolve()}updateLimboDocument(e,t){return this.gi.set(t,e.currentSequenceNumber),A.resolve()}Pi(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=Go(e.data.value)),t}Sr(e,t,r){return A.or([()=>this.persistence.Ei(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const i=this.gi.get(t);return A.resolve(i!==void 0&&i>r)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class YS{constructor(e){this.serializer=e}q(e,t,r,i){const s=new qa("createOrUpgrade",t);r<1&&i>=1&&((function(u){u.createObjectStore(Ks)})(e),(function(u){u.createObjectStore(Cs,{keyPath:pR}),u.createObjectStore(_t,{keyPath:Af,autoIncrement:!0}).createIndex(Zn,bf,{unique:!0}),u.createObjectStore(Yr)})(e),pp(e),(function(u){u.createObjectStore(Wn)})(e));let o=A.resolve();return r<3&&i>=3&&(r!==0&&((function(u){u.deleteObjectStore(Xr),u.deleteObjectStore(Jr),u.deleteObjectStore(rr)})(e),pp(e)),o=o.next((()=>(function(u){const l=u.store(rr),d={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:z.min().toTimestamp(),targetCount:0};return l.put(ca,d)})(s)))),r<4&&i>=4&&(r!==0&&(o=o.next((()=>(function(u,l){return l.store(_t).j().next((p=>{u.deleteObjectStore(_t),u.createObjectStore(_t,{keyPath:Af,autoIncrement:!0}).createIndex(Zn,bf,{unique:!0});const m=l.store(_t),T=p.map((P=>m.put(P)));return A.waitFor(T)}))})(e,s)))),o=o.next((()=>{(function(u){u.createObjectStore(Zr,{keyPath:wR})})(e)}))),r<5&&i>=5&&(o=o.next((()=>this.pi(s)))),r<6&&i>=6&&(o=o.next((()=>((function(u){u.createObjectStore(ks)})(e),this.yi(s))))),r<7&&i>=7&&(o=o.next((()=>this.wi(s)))),r<8&&i>=8&&(o=o.next((()=>this.Si(e,s)))),r<9&&i>=9&&(o=o.next((()=>{(function(u){u.objectStoreNames.contains("remoteDocumentChanges")&&u.deleteObjectStore("remoteDocumentChanges")})(e)}))),r<10&&i>=10&&(o=o.next((()=>this.bi(s)))),r<11&&i>=11&&(o=o.next((()=>{(function(u){u.createObjectStore(ja,{keyPath:AR})})(e),(function(u){u.createObjectStore($a,{keyPath:bR})})(e)}))),r<12&&i>=12&&(o=o.next((()=>{(function(u){const l=u.createObjectStore(za,{keyPath:NR});l.createIndex(wu,VR,{unique:!1}),l.createIndex(Gg,OR,{unique:!1})})(e)}))),r<13&&i>=13&&(o=o.next((()=>(function(u){const l=u.createObjectStore(aa,{keyPath:gR});l.createIndex($o,_R),l.createIndex(qg,yR)})(e))).next((()=>this.Di(e,s))).next((()=>e.deleteObjectStore(Wn)))),r<14&&i>=14&&(o=o.next((()=>this.Ci(e,s)))),r<15&&i>=15&&(o=o.next((()=>(function(u){u.createObjectStore(vl,{keyPath:RR,autoIncrement:!0}).createIndex(vu,SR,{unique:!1}),u.createObjectStore(ps,{keyPath:PR}).createIndex($g,CR,{unique:!1}),u.createObjectStore(ms,{keyPath:kR}).createIndex(zg,DR,{unique:!1})})(e)))),r<16&&i>=16&&(o=o.next((()=>{t.objectStore(ps).clear()})).next((()=>{t.objectStore(ms).clear()}))),r<17&&i>=17&&(o=o.next((()=>{(function(u){u.createObjectStore(wl,{keyPath:xR})})(e)}))),r<18&&i>=18&&um()&&(o=o.next((()=>{t.objectStore(ps).clear()})).next((()=>{t.objectStore(ms).clear()}))),o}yi(e){let t=0;return e.store(Wn).X(((r,i)=>{t+=ma(i)})).next((()=>{const r={byteSize:t};return e.store(ks).put(Eu,r)}))}pi(e){const t=e.store(Cs),r=e.store(_t);return t.j().next((i=>A.forEach(i,(s=>{const o=IDBKeyRange.bound([s.userId,vn],[s.userId,s.lastAcknowledgedBatchId]);return r.j(Zn,o).next((c=>A.forEach(c,(u=>{$(u.userId===s.userId,18650,"Cannot process batch from unexpected user",{batchId:u.batchId});const l=Qn(this.serializer,u);return X_(e,s.userId,l).next((()=>{}))}))))}))))}wi(e){const t=e.store(Xr),r=e.store(Wn);return e.store(rr).get(ca).next((i=>{const s=[];return r.X(((o,c)=>{const u=new Q(o),l=(function(p){return[0,ze(p)]})(u);s.push(t.get(l).next((d=>d?A.resolve():(p=>t.put({targetId:0,path:ze(p),sequenceNumber:i.highestListenSequenceNumber}))(u))))})).next((()=>A.waitFor(s)))}))}Si(e,t){e.createObjectStore(Ds,{keyPath:vR});const r=t.store(Ds),i=new Fl,s=o=>{if(i.add(o)){const c=o.lastSegment(),u=o.popLast();return r.put({collectionId:c,parent:ze(u)})}};return t.store(Wn).X({Z:!0},((o,c)=>{const u=new Q(o);return s(u.popLast())})).next((()=>t.store(Yr).X({Z:!0},(([o,c,u],l)=>{const d=bt(c);return s(d.popLast())}))))}bi(e){const t=e.store(Jr);return t.X(((r,i)=>{const s=os(i),o=H_(this.serializer,s);return t.put(o)}))}Di(e,t){const r=t.store(Wn),i=[];return r.X(((s,o)=>{const c=t.store(aa),u=(function(p){return p.document?new x(Q.fromString(p.document.name).popFirst(5)):p.noDocument?x.fromSegments(p.noDocument.path):p.unknownDocument?x.fromSegments(p.unknownDocument.path):q(36783)})(o).path.toArray(),l={prefixPath:u.slice(0,u.length-2),collectionGroup:u[u.length-2],documentId:u[u.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};i.push(c.put(l))})).next((()=>A.waitFor(i)))}Ci(e,t){const r=t.store(_t),i=sy(this.serializer),s=new Bl(tc.Vi,this.serializer.gt);return r.j().next((o=>{const c=new Map;return o.forEach((u=>{var l;let d=(l=c.get(u.userId))!==null&&l!==void 0?l:H();Qn(this.serializer,u).keys().forEach((p=>d=d.add(p))),c.set(u.userId,d)})),A.forEach(c,((u,l)=>{const d=new Ne(l),p=Za.yt(this.serializer,d),m=s.getIndexManager(d),T=ec.yt(d,this.serializer,m,s.referenceDelegate);return new oy(i,T,p,m).recalculateAndSaveOverlaysForDocumentKeys(new Au(t,Xe.ue),u).next()}))}))}}function pp(n){n.createObjectStore(Xr,{keyPath:TR}).createIndex(El,ER,{unique:!0}),n.createObjectStore(Jr,{keyPath:"targetId"}).createIndex(jg,IR,{unique:!0}),n.createObjectStore(rr)}const hn="IndexedDbPersistence",Jc=18e5,Xc=5e3,Zc="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",ay="main";class ql{constructor(e,t,r,i,s,o,c,u,l,d,p=18){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=r,this.Fi=s,this.window=o,this.document=c,this.Mi=l,this.xi=d,this.Oi=p,this.ui=null,this.ci=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Ni=null,this.inForeground=!1,this.Bi=null,this.Li=null,this.ki=Number.NEGATIVE_INFINITY,this.qi=m=>Promise.resolve(),!ql.C())throw new N(R.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new FS(this,i),this.Qi=t+ay,this.serializer=new W_(u),this.$i=new Pt(this.Qi,this.Oi,new YS(this.serializer)),this.li=new SS,this.hi=new xS(this.referenceDelegate,this.serializer),this.remoteDocumentCache=sy(this.serializer),this.Ti=new RS,this.window&&this.window.localStorage?this.Ui=this.window.localStorage:(this.Ui=null,d===!1&&we(hn,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.Ki().then((()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new N(R.FAILED_PRECONDITION,Zc);return this.Wi(),this.Gi(),this.zi(),this.runTransaction("getHighestListenSequenceNumber","readonly",(e=>this.hi.getHighestSequenceNumber(e)))})).then((e=>{this.ui=new Xe(e,this.Mi)})).then((()=>{this.ci=!0})).catch((e=>(this.$i&&this.$i.close(),Promise.reject(e))))}ji(e){return this.qi=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.$i.setDatabaseDeletedListener(e)}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.Fi.enqueueAndForget((async()=>{this.started&&await this.Ki()})))}Ki(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",(e=>No(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next((()=>{if(this.isPrimary)return this.Ji(e).next((t=>{t||(this.isPrimary=!1,this.Fi.enqueueRetryable((()=>this.qi(!1))))}))})).next((()=>this.Hi(e))).next((t=>this.isPrimary&&!t?this.Yi(e).next((()=>!1)):!!t&&this.Zi(e).next((()=>!0)))))).catch((e=>{if(Vn(e))return V(hn,"Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return V(hn,"Releasing owner lease after error during lease refresh",e),!1})).then((e=>{this.isPrimary!==e&&this.Fi.enqueueRetryable((()=>this.qi(e))),this.isPrimary=e}))}Ji(e){return Xi(e).get(kr).next((t=>A.resolve(this.Xi(t))))}es(e){return No(e).delete(this.clientId)}async ts(){if(this.isPrimary&&!this.ns(this.ki,Jc)){this.ki=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",(t=>{const r=ke(t,Zr);return r.j().next((i=>{const s=this.rs(i,Jc),o=i.filter((c=>s.indexOf(c)===-1));return A.forEach(o,(c=>r.delete(c.clientId))).next((()=>o))}))})).catch((()=>[]));if(this.Ui)for(const t of e)this.Ui.removeItem(this.ss(t.clientId))}}zi(){this.Li=this.Fi.enqueueAfterDelay("client_metadata_refresh",4e3,(()=>this.Ki().then((()=>this.ts())).then((()=>this.zi()))))}Xi(e){return!!e&&e.ownerId===this.clientId}Hi(e){return this.xi?A.resolve(!0):Xi(e).get(kr).next((t=>{if(t!==null&&this.ns(t.leaseTimestampMs,Xc)&&!this._s(t.ownerId)){if(this.Xi(t)&&this.networkEnabled)return!0;if(!this.Xi(t)){if(!t.allowTabSynchronization)throw new N(R.FAILED_PRECONDITION,Zc);return!1}}return!(!this.networkEnabled||!this.inForeground)||No(e).j().next((r=>this.rs(r,Xc).find((i=>{if(this.clientId!==i.clientId){const s=!this.networkEnabled&&i.networkEnabled,o=!this.inForeground&&i.inForeground,c=this.networkEnabled===i.networkEnabled;if(s||o&&c)return!0}return!1}))===void 0))})).next((t=>(this.isPrimary!==t&&V(hn,`Client ${t?"is":"is not"} eligible for a primary lease.`),t)))}async shutdown(){this.ci=!1,this.us(),this.Li&&(this.Li.cancel(),this.Li=null),this.cs(),this.ls(),await this.$i.runTransaction("shutdown","readwrite",[Ks,Zr],(e=>{const t=new Au(e,Xe.ue);return this.Yi(t).next((()=>this.es(t)))})),this.$i.close(),this.hs()}rs(e,t){return e.filter((r=>this.ns(r.updateTimeMs,t)&&!this._s(r.clientId)))}Ps(){return this.runTransaction("getActiveClients","readonly",(e=>No(e).j().next((t=>this.rs(t,Jc).map((r=>r.clientId))))))}get started(){return this.ci}getGlobalsCache(){return this.li}getMutationQueue(e,t){return ec.yt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.hi}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new OS(e,this.serializer.gt.databaseId)}getDocumentOverlayCache(e){return Za.yt(this.serializer,e)}getBundleCache(){return this.Ti}runTransaction(e,t,r){V(hn,"Starting transaction:",e);const i=t==="readonly"?"readonly":"readwrite",s=(function(u){return u===18?FR:u===17?Qg:u===16?MR:u===15?Al:u===14?Hg:u===13?Wg:u===12?LR:u===11?Kg:void q(60245)})(this.Oi);let o;return this.$i.runTransaction(e,i,s,(c=>(o=new Au(c,this.ui?this.ui.next():Xe.ue),t==="readwrite-primary"?this.Ji(o).next((u=>!!u||this.Hi(o))).next((u=>{if(!u)throw we(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.Fi.enqueueRetryable((()=>this.qi(!1))),new N(R.FAILED_PRECONDITION,Lg);return r(o)})).next((u=>this.Zi(o).next((()=>u)))):this.Ts(o).next((()=>r(o)))))).then((c=>(o.raiseOnCommittedEvent(),c)))}Ts(e){return Xi(e).get(kr).next((t=>{if(t!==null&&this.ns(t.leaseTimestampMs,Xc)&&!this._s(t.ownerId)&&!this.Xi(t)&&!(this.xi||this.allowTabSynchronization&&t.allowTabSynchronization))throw new N(R.FAILED_PRECONDITION,Zc)}))}Zi(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return Xi(e).put(kr,t)}static C(){return Pt.C()}Yi(e){const t=Xi(e);return t.get(kr).next((r=>this.Xi(r)?(V(hn,"Releasing primary lease."),t.delete(kr)):A.resolve()))}ns(e,t){const r=Date.now();return!(e<r-t)&&(!(e>r)||(we(`Detected an update time that is in the future: ${e} > ${r}`),!1))}Wi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Bi=()=>{this.Fi.enqueueAndForget((()=>(this.inForeground=this.document.visibilityState==="visible",this.Ki())))},this.document.addEventListener("visibilitychange",this.Bi),this.inForeground=this.document.visibilityState==="visible")}cs(){this.Bi&&(this.document.removeEventListener("visibilitychange",this.Bi),this.Bi=null)}Gi(){var e;typeof((e=this.window)===null||e===void 0?void 0:e.addEventListener)=="function"&&(this.Ni=()=>{this.us();const t=/(?:Version|Mobile)\/1[456]/;cm()&&(navigator.appVersion.match(t)||navigator.userAgent.match(t))&&this.Fi.enterRestrictedMode(!0),this.Fi.enqueueAndForget((()=>this.shutdown()))},this.window.addEventListener("pagehide",this.Ni))}ls(){this.Ni&&(this.window.removeEventListener("pagehide",this.Ni),this.Ni=null)}_s(e){var t;try{const r=((t=this.Ui)===null||t===void 0?void 0:t.getItem(this.ss(e)))!==null;return V(hn,`Client '${e}' ${r?"is":"is not"} zombied in LocalStorage`),r}catch(r){return we(hn,"Failed to get zombied client id.",r),!1}}us(){if(this.Ui)try{this.Ui.setItem(this.ss(this.clientId),String(Date.now()))}catch(e){we("Failed to set zombie client id.",e)}}hs(){if(this.Ui)try{this.Ui.removeItem(this.ss(this.clientId))}catch{}}ss(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function Xi(n){return ke(n,Ks)}function No(n){return ke(n,Zr)}function jl(n,e){let t=n.projectId;return n.isDefaultDatabase||(t+="."+n.database),"firestore/"+e+"/"+t+"/"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $l{constructor(e,t,r,i){this.targetId=e,this.fromCache=t,this.Is=r,this.ds=i}static Es(e,t){let r=H(),i=H();for(const s of t.docChanges)switch(s.type){case 0:r=r.add(s.doc.key);break;case 1:i=i.add(s.doc.key)}return new $l(e,t.fromCache,r,i)}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class JS{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cy{constructor(){this.As=!1,this.Rs=!1,this.Vs=100,this.fs=(function(){return cm()?8:Fg(Pe())>0?6:4})()}initialize(e,t){this.gs=e,this.indexManager=t,this.As=!0}getDocumentsMatchingQuery(e,t,r,i){const s={result:null};return this.ps(e,t).next((o=>{s.result=o})).next((()=>{if(!s.result)return this.ys(e,t,i,r).next((o=>{s.result=o}))})).next((()=>{if(s.result)return;const o=new JS;return this.ws(e,t,o).next((c=>{if(s.result=c,this.Rs)return this.Ss(e,t,o,c.size)}))})).next((()=>s.result))}Ss(e,t,r,i){return r.documentReadCount<this.Vs?(Lr()<=X.DEBUG&&V("QueryEngine","SDK will not create cache indexes for query:",Mr(t),"since it only creates cache indexes for collection contains","more than or equal to",this.Vs,"documents"),A.resolve()):(Lr()<=X.DEBUG&&V("QueryEngine","Query:",Mr(t),"scans",r.documentReadCount,"local documents and returns",i,"documents as results."),r.documentReadCount>this.fs*i?(Lr()<=X.DEBUG&&V("QueryEngine","The SDK decides to create cache indexes for query:",Mr(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,Ge(t))):A.resolve())}ps(e,t){if(Ff(t))return A.resolve(null);let r=Ge(t);return this.indexManager.getIndexType(e,r).next((i=>i===0?null:(t.limit!==null&&i===1&&(t=ha(t,null,"F"),r=Ge(t)),this.indexManager.getDocumentsMatchingTarget(e,r).next((s=>{const o=H(...s);return this.gs.getDocuments(e,o).next((c=>this.indexManager.getMinOffset(e,r).next((u=>{const l=this.bs(t,c);return this.Ds(t,l,o,u.readTime)?this.ps(e,ha(t,null,"F")):this.vs(e,l,t,u)}))))})))))}ys(e,t,r,i){return Ff(t)||i.isEqual(z.min())?A.resolve(null):this.gs.getDocuments(e,r).next((s=>{const o=this.bs(t,s);return this.Ds(t,o,r,i)?A.resolve(null):(Lr()<=X.DEBUG&&V("QueryEngine","Re-using previous result from %s to execute query: %s",i.toString(),Mr(t)),this.vs(e,o,t,Og(i,Wr)).next((c=>c)))}))}bs(e,t){let r=new se(I_(e));return t.forEach(((i,s)=>{Qs(e,s)&&(r=r.add(s))})),r}Ds(e,t,r,i){if(e.limit===null)return!1;if(r.size!==t.size)return!0;const s=e.limitType==="F"?t.last():t.first();return!!s&&(s.hasPendingWrites||s.version.compareTo(i)>0)}ws(e,t,r){return Lr()<=X.DEBUG&&V("QueryEngine","Using full collection scan to execute query:",Mr(t)),this.gs.getDocumentsMatchingQuery(e,t,lt.min(),r)}vs(e,t,r,i){return this.gs.getDocumentsMatchingQuery(e,r,i).next((s=>(t.forEach((o=>{s=s.insert(o.key,o)})),s)))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zl="LocalStore",XS=3e8;class ZS{constructor(e,t,r,i){this.persistence=e,this.Cs=t,this.serializer=i,this.Fs=new ce(K),this.Ms=new en((s=>ar(s)),Ws),this.xs=new Map,this.Os=e.getRemoteDocumentCache(),this.hi=e.getTargetCache(),this.Ti=e.getBundleCache(),this.Ns(r)}Ns(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new oy(this.Os,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.Os.setIndexManager(this.indexManager),this.Cs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",(t=>e.collect(t,this.Fs)))}}function uy(n,e,t,r){return new ZS(n,e,t,r)}async function ly(n,e){const t=L(n);return await t.persistence.runTransaction("Handle user change","readonly",(r=>{let i;return t.mutationQueue.getAllMutationBatches(r).next((s=>(i=s,t.Ns(e),t.mutationQueue.getAllMutationBatches(r)))).next((s=>{const o=[],c=[];let u=H();for(const l of i){o.push(l.batchId);for(const d of l.mutations)u=u.add(d.key)}for(const l of s){c.push(l.batchId);for(const d of l.mutations)u=u.add(d.key)}return t.localDocuments.getDocuments(r,u).next((l=>({Bs:l,removedBatchIds:o,addedBatchIds:c})))}))}))}function eP(n,e){const t=L(n);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",(r=>{const i=e.batch.keys(),s=t.Os.newChangeBuffer({trackRemovals:!0});return(function(c,u,l,d){const p=l.batch,m=p.keys();let T=A.resolve();return m.forEach((P=>{T=T.next((()=>d.getEntry(u,P))).next((D=>{const k=l.docVersions.get(P);$(k!==null,48541),D.version.compareTo(k)<0&&(p.applyToRemoteDocument(D,l),D.isValidDocument()&&(D.setReadTime(l.commitVersion),d.addEntry(D)))}))})),T.next((()=>c.mutationQueue.removeMutationBatch(u,p)))})(t,r,e,s).next((()=>s.apply(r))).next((()=>t.mutationQueue.performConsistencyCheck(r))).next((()=>t.documentOverlayCache.removeOverlaysForBatchId(r,i,e.batch.batchId))).next((()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(r,(function(c){let u=H();for(let l=0;l<c.mutationResults.length;++l)c.mutationResults[l].transformResults.length>0&&(u=u.add(c.batch.mutations[l].key));return u})(e)))).next((()=>t.localDocuments.getDocuments(r,i)))}))}function hy(n){const e=L(n);return e.persistence.runTransaction("Get last remote snapshot version","readonly",(t=>e.hi.getLastRemoteSnapshotVersion(t)))}function tP(n,e){const t=L(n),r=e.snapshotVersion;let i=t.Fs;return t.persistence.runTransaction("Apply remote event","readwrite-primary",(s=>{const o=t.Os.newChangeBuffer({trackRemovals:!0});i=t.Fs;const c=[];e.targetChanges.forEach(((d,p)=>{const m=i.get(p);if(!m)return;c.push(t.hi.removeMatchingKeys(s,d.removedDocuments,p).next((()=>t.hi.addMatchingKeys(s,d.addedDocuments,p))));let T=m.withSequenceNumber(s.currentSequenceNumber);e.targetMismatches.get(p)!==null?T=T.withResumeToken(ye.EMPTY_BYTE_STRING,z.min()).withLastLimboFreeSnapshotVersion(z.min()):d.resumeToken.approximateByteSize()>0&&(T=T.withResumeToken(d.resumeToken,r)),i=i.insert(p,T),(function(D,k,U){return D.resumeToken.approximateByteSize()===0||k.snapshotVersion.toMicroseconds()-D.snapshotVersion.toMicroseconds()>=XS?!0:U.addedDocuments.size+U.modifiedDocuments.size+U.removedDocuments.size>0})(m,T,d)&&c.push(t.hi.updateTargetData(s,T))}));let u=et(),l=H();if(e.documentUpdates.forEach((d=>{e.resolvedLimboDocuments.has(d)&&c.push(t.persistence.referenceDelegate.updateLimboDocument(s,d))})),c.push(dy(s,o,e.documentUpdates).next((d=>{u=d.Ls,l=d.ks}))),!r.isEqual(z.min())){const d=t.hi.getLastRemoteSnapshotVersion(s).next((p=>t.hi.setTargetsMetadata(s,s.currentSequenceNumber,r)));c.push(d)}return A.waitFor(c).next((()=>o.apply(s))).next((()=>t.localDocuments.getLocalViewOfDocuments(s,u,l))).next((()=>u))})).then((s=>(t.Fs=i,s)))}function dy(n,e,t){let r=H(),i=H();return t.forEach((s=>r=r.add(s))),e.getEntries(n,r).next((s=>{let o=et();return t.forEach(((c,u)=>{const l=s.get(c);u.isFoundDocument()!==l.isFoundDocument()&&(i=i.add(c)),u.isNoDocument()&&u.version.isEqual(z.min())?(e.removeEntry(c,u.readTime),o=o.insert(c,u)):!l.isValidDocument()||u.version.compareTo(l.version)>0||u.version.compareTo(l.version)===0&&l.hasPendingWrites?(e.addEntry(u),o=o.insert(c,u)):V(zl,"Ignoring outdated watch update for ",c,". Current version:",l.version," Watch version:",u.version)})),{Ls:o,ks:i}}))}function nP(n,e){const t=L(n);return t.persistence.runTransaction("Get next mutation batch","readonly",(r=>(e===void 0&&(e=vn),t.mutationQueue.getNextMutationBatchAfterBatchId(r,e))))}function oi(n,e){const t=L(n);return t.persistence.runTransaction("Allocate target","readwrite",(r=>{let i;return t.hi.getTargetData(r,e).next((s=>s?(i=s,A.resolve(i)):t.hi.allocateTargetId(r).next((o=>(i=new jt(e,o,"TargetPurposeListen",r.currentSequenceNumber),t.hi.addTargetData(r,i).next((()=>i)))))))})).then((r=>{const i=t.Fs.get(r.targetId);return(i===null||r.snapshotVersion.compareTo(i.snapshotVersion)>0)&&(t.Fs=t.Fs.insert(r.targetId,r),t.Ms.set(e,r.targetId)),r}))}async function ai(n,e,t){const r=L(n),i=r.Fs.get(e),s=t?"readwrite":"readwrite-primary";try{t||await r.persistence.runTransaction("Release target",s,(o=>r.persistence.referenceDelegate.removeTarget(o,i)))}catch(o){if(!Vn(o))throw o;V(zl,`Failed to update sequence numbers for target ${e}: ${o}`)}r.Fs=r.Fs.remove(e),r.Ms.delete(i.target)}function _a(n,e,t){const r=L(n);let i=z.min(),s=H();return r.persistence.runTransaction("Execute query","readwrite",(o=>(function(u,l,d){const p=L(u),m=p.Ms.get(d);return m!==void 0?A.resolve(p.Fs.get(m)):p.hi.getTargetData(l,d)})(r,o,Ge(e)).next((c=>{if(c)return i=c.lastLimboFreeSnapshotVersion,r.hi.getMatchingKeysForTargetId(o,c.targetId).next((u=>{s=u}))})).next((()=>r.Cs.getDocumentsMatchingQuery(o,e,t?i:z.min(),t?s:H()))).next((c=>(my(r,y_(e),c),{documents:c,qs:s})))))}function fy(n,e){const t=L(n),r=L(t.hi),i=t.Fs.get(e);return i?Promise.resolve(i.target):t.persistence.runTransaction("Get target data","readonly",(s=>r.Et(s,e).next((o=>o?o.target:null))))}function py(n,e){const t=L(n),r=t.xs.get(e)||z.min();return t.persistence.runTransaction("Get new document changes","readonly",(i=>t.Os.getAllFromCollectionGroup(i,e,Og(r,Wr),Number.MAX_SAFE_INTEGER))).then((i=>(my(t,e,i),i)))}function my(n,e,t){let r=n.xs.get(e)||z.min();t.forEach(((i,s)=>{s.readTime.compareTo(r)>0&&(r=s.readTime)})),n.xs.set(e,r)}async function rP(n,e,t,r){const i=L(n);let s=H(),o=et();for(const l of t){const d=e.Qs(l.metadata.name);l.document&&(s=s.add(d));const p=e.$s(l);p.setReadTime(e.Us(l.metadata.readTime)),o=o.insert(d,p)}const c=i.Os.newChangeBuffer({trackRemovals:!0}),u=await oi(i,(function(d){return Ge(Ii(Q.fromString(`__bundle__/docs/${d}`)))})(r));return i.persistence.runTransaction("Apply bundle documents","readwrite",(l=>dy(l,c,o).next((d=>(c.apply(l),d))).next((d=>i.hi.removeMatchingKeysForTargetId(l,u.targetId).next((()=>i.hi.addMatchingKeys(l,s,u.targetId))).next((()=>i.localDocuments.getLocalViewOfDocuments(l,d.Ls,d.ks))).next((()=>d.Ls))))))}async function iP(n,e,t=H()){const r=await oi(n,Ge(Xa(e.bundledQuery))),i=L(n);return i.persistence.runTransaction("Save named query","readwrite",(s=>{const o=Ae(e.readTime);if(r.snapshotVersion.compareTo(o)>=0)return i.Ti.saveNamedQuery(s,e);const c=r.withResumeToken(ye.EMPTY_BYTE_STRING,o);return i.Fs=i.Fs.insert(c.targetId,c),i.hi.updateTargetData(s,c).next((()=>i.hi.removeMatchingKeysForTargetId(s,r.targetId))).next((()=>i.hi.addMatchingKeys(s,t,r.targetId))).next((()=>i.Ti.saveNamedQuery(s,e)))}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gy="firestore_clients";function mp(n,e){return`${gy}_${n}_${e}`}const _y="firestore_mutations";function gp(n,e,t){let r=`${_y}_${n}_${t}`;return e.isAuthenticated()&&(r+=`_${e.uid}`),r}const yy="firestore_targets";function eu(n,e){return`${yy}_${n}_${e}`}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wt="SharedClientState";class ya{constructor(e,t,r,i){this.user=e,this.batchId=t,this.state=r,this.error=i}static Ks(e,t,r){const i=JSON.parse(r);let s,o=typeof i=="object"&&["pending","acknowledged","rejected"].indexOf(i.state)!==-1&&(i.error===void 0||typeof i.error=="object");return o&&i.error&&(o=typeof i.error.message=="string"&&typeof i.error.code=="string",o&&(s=new N(i.error.code,i.error.message))),o?new ya(e,t,i.state,s):(we(wt,`Failed to parse mutation state for ID '${t}': ${r}`),null)}Ws(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Is{constructor(e,t,r){this.targetId=e,this.state=t,this.error=r}static Ks(e,t){const r=JSON.parse(t);let i,s=typeof r=="object"&&["not-current","current","rejected"].indexOf(r.state)!==-1&&(r.error===void 0||typeof r.error=="object");return s&&r.error&&(s=typeof r.error.message=="string"&&typeof r.error.code=="string",s&&(i=new N(r.error.code,r.error.message))),s?new Is(e,r.state,i):(we(wt,`Failed to parse target state for ID '${e}': ${t}`),null)}Ws(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Ia{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static Ks(e,t){const r=JSON.parse(t);let i=typeof r=="object"&&r.activeTargetIds instanceof Array,s=Cl();for(let o=0;i&&o<r.activeTargetIds.length;++o)i=Ug(r.activeTargetIds[o]),s=s.add(r.activeTargetIds[o]);return i?new Ia(e,s):(we(wt,`Failed to parse client data for instance '${e}': ${t}`),null)}}class Gl{constructor(e,t){this.clientId=e,this.onlineState=t}static Ks(e){const t=JSON.parse(e);return typeof t=="object"&&["Unknown","Online","Offline"].indexOf(t.onlineState)!==-1&&typeof t.clientId=="string"?new Gl(t.clientId,t.onlineState):(we(wt,`Failed to parse online state: ${e}`),null)}}class Fu{constructor(){this.activeTargetIds=Cl()}Gs(e){this.activeTargetIds=this.activeTargetIds.add(e)}zs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Ws(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class tu{constructor(e,t,r,i,s){this.window=e,this.Fi=t,this.persistenceKey=r,this.js=i,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.Js=this.Hs.bind(this),this.Ys=new ce(K),this.started=!1,this.Zs=[];const o=r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=s,this.Xs=mp(this.persistenceKey,this.js),this.eo=(function(u){return`firestore_sequence_number_${u}`})(this.persistenceKey),this.Ys=this.Ys.insert(this.js,new Fu),this.no=new RegExp(`^${gy}_${o}_([^_]*)$`),this.ro=new RegExp(`^${_y}_${o}_(\\d+)(?:_(.*))?$`),this.io=new RegExp(`^${yy}_${o}_(\\d+)$`),this.so=(function(u){return`firestore_online_state_${u}`})(this.persistenceKey),this.oo=(function(u){return`firestore_bundle_loaded_v2_${u}`})(this.persistenceKey),this.window.addEventListener("storage",this.Js)}static C(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.Ps();for(const r of e){if(r===this.js)continue;const i=this.getItem(mp(this.persistenceKey,r));if(i){const s=Ia.Ks(r,i);s&&(this.Ys=this.Ys.insert(s.clientId,s))}}this._o();const t=this.storage.getItem(this.so);if(t){const r=this.ao(t);r&&this.uo(r)}for(const r of this.Zs)this.Hs(r);this.Zs=[],this.window.addEventListener("pagehide",(()=>this.shutdown())),this.started=!0}writeSequenceNumber(e){this.setItem(this.eo,JSON.stringify(e))}getAllActiveQueryTargets(){return this.co(this.Ys)}isActiveQueryTarget(e){let t=!1;return this.Ys.forEach(((r,i)=>{i.activeTargetIds.has(e)&&(t=!0)})),t}addPendingMutation(e){this.lo(e,"pending")}updateMutationState(e,t,r){this.lo(e,t,r),this.ho(e)}addLocalQueryTarget(e,t=!0){let r="not-current";if(this.isActiveQueryTarget(e)){const i=this.storage.getItem(eu(this.persistenceKey,e));if(i){const s=Is.Ks(e,i);s&&(r=s.state)}}return t&&this.Po.Gs(e),this._o(),r}removeLocalQueryTarget(e){this.Po.zs(e),this._o()}isLocalQueryTarget(e){return this.Po.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(eu(this.persistenceKey,e))}updateQueryState(e,t,r){this.To(e,t,r)}handleUserChange(e,t,r){t.forEach((i=>{this.ho(i)})),this.currentUser=e,r.forEach((i=>{this.addPendingMutation(i)}))}setOnlineState(e){this.Io(e)}notifyBundleLoaded(e){this.Eo(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.Js),this.removeItem(this.Xs),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return V(wt,"READ",e,t),t}setItem(e,t){V(wt,"SET",e,t),this.storage.setItem(e,t)}removeItem(e){V(wt,"REMOVE",e),this.storage.removeItem(e)}Hs(e){const t=e;if(t.storageArea===this.storage){if(V(wt,"EVENT",t.key,t.newValue),t.key===this.Xs)return void we("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Fi.enqueueRetryable((async()=>{if(this.started){if(t.key!==null){if(this.no.test(t.key)){if(t.newValue==null){const r=this.Ao(t.key);return this.Ro(r,null)}{const r=this.Vo(t.key,t.newValue);if(r)return this.Ro(r.clientId,r)}}else if(this.ro.test(t.key)){if(t.newValue!==null){const r=this.mo(t.key,t.newValue);if(r)return this.fo(r)}}else if(this.io.test(t.key)){if(t.newValue!==null){const r=this.po(t.key,t.newValue);if(r)return this.yo(r)}}else if(t.key===this.so){if(t.newValue!==null){const r=this.ao(t.newValue);if(r)return this.uo(r)}}else if(t.key===this.eo){const r=(function(s){let o=Xe.ue;if(s!=null)try{const c=JSON.parse(s);$(typeof c=="number",30636,{wo:s}),o=c}catch(c){we(wt,"Failed to read sequence number from WebStorage",c)}return o})(t.newValue);r!==Xe.ue&&this.sequenceNumberHandler(r)}else if(t.key===this.oo){const r=this.So(t.newValue);await Promise.all(r.map((i=>this.syncEngine.bo(i))))}}}else this.Zs.push(t)}))}}get Po(){return this.Ys.get(this.js)}_o(){this.setItem(this.Xs,this.Po.Ws())}lo(e,t,r){const i=new ya(this.currentUser,e,t,r),s=gp(this.persistenceKey,this.currentUser,e);this.setItem(s,i.Ws())}ho(e){const t=gp(this.persistenceKey,this.currentUser,e);this.removeItem(t)}Io(e){const t={clientId:this.js,onlineState:e};this.storage.setItem(this.so,JSON.stringify(t))}To(e,t,r){const i=eu(this.persistenceKey,e),s=new Is(e,t,r);this.setItem(i,s.Ws())}Eo(e){const t=JSON.stringify(Array.from(e));this.setItem(this.oo,t)}Ao(e){const t=this.no.exec(e);return t?t[1]:null}Vo(e,t){const r=this.Ao(e);return Ia.Ks(r,t)}mo(e,t){const r=this.ro.exec(e),i=Number(r[1]),s=r[2]!==void 0?r[2]:null;return ya.Ks(new Ne(s),i,t)}po(e,t){const r=this.io.exec(e),i=Number(r[1]);return Is.Ks(i,t)}ao(e){return Gl.Ks(e)}So(e){return JSON.parse(e)}async fo(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.Do(e.batchId,e.state,e.error);V(wt,`Ignoring mutation for non-active user ${e.user.uid}`)}yo(e){return this.syncEngine.vo(e.targetId,e.state,e.error)}Ro(e,t){const r=t?this.Ys.insert(e,t):this.Ys.remove(e),i=this.co(this.Ys),s=this.co(r),o=[],c=[];return s.forEach((u=>{i.has(u)||o.push(u)})),i.forEach((u=>{s.has(u)||c.push(u)})),this.syncEngine.Co(o,c).then((()=>{this.Ys=r}))}uo(e){this.Ys.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}co(e){let t=Cl();return e.forEach(((r,i)=>{t=t.unionWith(i.activeTargetIds)})),t}}class Iy{constructor(){this.Fo=new Fu,this.Mo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,r){}addLocalQueryTarget(e,t=!0){return t&&this.Fo.Gs(e),this.Mo[e]||"not-current"}updateQueryState(e,t,r){this.Mo[e]=t}removeLocalQueryTarget(e){this.Fo.zs(e)}isLocalQueryTarget(e){return this.Fo.activeTargetIds.has(e)}clearQueryState(e){delete this.Mo[e]}getAllActiveQueryTargets(){return this.Fo.activeTargetIds}isActiveQueryTarget(e){return this.Fo.activeTargetIds.has(e)}start(){return this.Fo=new Fu,Promise.resolve()}handleUserChange(e,t,r){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sP{xo(e){}shutdown(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _p="ConnectivityMonitor";class yp{constructor(){this.Oo=()=>this.No(),this.Bo=()=>this.Lo(),this.ko=[],this.qo()}xo(e){this.ko.push(e)}shutdown(){window.removeEventListener("online",this.Oo),window.removeEventListener("offline",this.Bo)}qo(){window.addEventListener("online",this.Oo),window.addEventListener("offline",this.Bo)}No(){V(_p,"Network connectivity changed: AVAILABLE");for(const e of this.ko)e(0)}Lo(){V(_p,"Network connectivity changed: UNAVAILABLE");for(const e of this.ko)e(1)}static C(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Vo=null;function Uu(){return Vo===null?Vo=(function(){return 268435456+Math.round(2147483648*Math.random())})():Vo++,"0x"+Vo.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nu="RestConnection",oP={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};class aP{get Qo(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",r=encodeURIComponent(this.databaseId.projectId),i=encodeURIComponent(this.databaseId.database);this.$o=t+"://"+e.host,this.Uo=`projects/${r}/databases/${i}`,this.Ko=this.databaseId.database===Vs?`project_id=${r}`:`project_id=${r}&database_id=${i}`}Wo(e,t,r,i,s){const o=Uu(),c=this.Go(e,t.toUriEncodedString());V(nu,`Sending RPC '${e}' ${o}:`,c,r);const u={"google-cloud-resource-prefix":this.Uo,"x-goog-request-params":this.Ko};this.zo(u,i,s);const{host:l}=new URL(c),d=Yt(l);return this.jo(e,c,u,r,d).then((p=>(V(nu,`Received RPC '${e}' ${o}: `,p),p)),(p=>{throw Ke(nu,`RPC '${e}' ${o} failed with error: `,p,"url: ",c,"request:",r),p}))}Jo(e,t,r,i,s,o){return this.Wo(e,t,r,i,s)}zo(e,t,r){e["X-Goog-Api-Client"]=(function(){return"gl-js/ fire/"+yi})(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach(((i,s)=>e[s]=i)),r&&r.headers.forEach(((i,s)=>e[s]=i))}Go(e,t){const r=oP[e];return`${this.$o}/v1/${t}:${r}`}terminate(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cP{constructor(e){this.Ho=e.Ho,this.Yo=e.Yo}Zo(e){this.Xo=e}e_(e){this.t_=e}n_(e){this.r_=e}onMessage(e){this.i_=e}close(){this.Yo()}send(e){this.Ho(e)}s_(){this.Xo()}o_(){this.t_()}__(e){this.r_(e)}a_(e){this.i_(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const je="WebChannelConnection";class uP extends aP{constructor(e){super(e),this.u_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}jo(e,t,r,i,s){const o=Uu();return new Promise(((c,u)=>{const l=new vg;l.setWithCredentials(!0),l.listenOnce(wg.COMPLETE,(()=>{try{switch(l.getLastErrorCode()){case qo.NO_ERROR:const p=l.getResponseJson();V(je,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(p)),c(p);break;case qo.TIMEOUT:V(je,`RPC '${e}' ${o} timed out`),u(new N(R.DEADLINE_EXCEEDED,"Request time out"));break;case qo.HTTP_ERROR:const m=l.getStatus();if(V(je,`RPC '${e}' ${o} failed with status:`,m,"response text:",l.getResponseText()),m>0){let T=l.getResponseJson();Array.isArray(T)&&(T=T[0]);const P=T==null?void 0:T.error;if(P&&P.status&&P.message){const D=(function(U){const B=U.toLowerCase().replace(/_/g,"-");return Object.values(R).indexOf(B)>=0?B:R.UNKNOWN})(P.status);u(new N(D,P.message))}else u(new N(R.UNKNOWN,"Server responded with status "+l.getStatus()))}else u(new N(R.UNAVAILABLE,"Connection failed."));break;default:q(9055,{c_:e,streamId:o,l_:l.getLastErrorCode(),h_:l.getLastError()})}}finally{V(je,`RPC '${e}' ${o} completed.`)}}));const d=JSON.stringify(i);V(je,`RPC '${e}' ${o} sending request:`,i),l.send(t,"POST",d,r,15)}))}P_(e,t,r){const i=Uu(),s=[this.$o,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=Rg(),c=bg(),u={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},l=this.longPollingOptions.timeoutSeconds;l!==void 0&&(u.longPollingTimeout=Math.round(1e3*l)),this.useFetchStreams&&(u.useFetchStreams=!0),this.zo(u.initMessageHeaders,t,r),u.encodeInitMessageHeaders=!0;const d=s.join("");V(je,`Creating RPC '${e}' stream ${i}: ${d}`,u);const p=o.createWebChannel(d,u);this.T_(p);let m=!1,T=!1;const P=new cP({Ho:k=>{T?V(je,`Not sending because RPC '${e}' stream ${i} is closed:`,k):(m||(V(je,`Opening RPC '${e}' stream ${i} transport.`),p.open(),m=!0),V(je,`RPC '${e}' stream ${i} sending:`,k),p.send(k))},Yo:()=>p.close()}),D=(k,U,B)=>{k.listen(U,(M=>{try{B(M)}catch(G){setTimeout((()=>{throw G}),0)}}))};return D(p,rs.EventType.OPEN,(()=>{T||(V(je,`RPC '${e}' stream ${i} transport opened.`),P.s_())})),D(p,rs.EventType.CLOSE,(()=>{T||(T=!0,V(je,`RPC '${e}' stream ${i} transport closed`),P.__(),this.I_(p))})),D(p,rs.EventType.ERROR,(k=>{T||(T=!0,Ke(je,`RPC '${e}' stream ${i} transport errored. Name:`,k.name,"Message:",k.message),P.__(new N(R.UNAVAILABLE,"The operation could not be completed")))})),D(p,rs.EventType.MESSAGE,(k=>{var U;if(!T){const B=k.data[0];$(!!B,16349);const M=B,G=(M==null?void 0:M.error)||((U=M[0])===null||U===void 0?void 0:U.error);if(G){V(je,`RPC '${e}' stream ${i} received error:`,G);const J=G.status;let W=(function(I){const v=be[I];if(v!==void 0)return V_(v)})(J),E=G.message;W===void 0&&(W=R.INTERNAL,E="Unknown error status: "+J+" with message "+G.message),T=!0,P.__(new N(W,E)),p.close()}else V(je,`RPC '${e}' stream ${i} received:`,B),P.a_(B)}})),D(c,Ag.STAT_EVENT,(k=>{k.stat===gu.PROXY?V(je,`RPC '${e}' stream ${i} detected buffering proxy`):k.stat===gu.NOPROXY&&V(je,`RPC '${e}' stream ${i} detected no buffering proxy`)})),setTimeout((()=>{P.o_()}),0),P}terminate(){this.u_.forEach((e=>e.close())),this.u_=[]}T_(e){this.u_.push(e)}I_(e){this.u_=this.u_.filter((t=>t===e))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ty(){return typeof window<"u"?window:null}function Yo(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vr(n){return new mS(n,!0)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kl{constructor(e,t,r=1e3,i=1.5,s=6e4){this.Fi=e,this.timerId=t,this.d_=r,this.E_=i,this.A_=s,this.R_=0,this.V_=null,this.m_=Date.now(),this.reset()}reset(){this.R_=0}f_(){this.R_=this.A_}g_(e){this.cancel();const t=Math.floor(this.R_+this.p_()),r=Math.max(0,Date.now()-this.m_),i=Math.max(0,t-r);i>0&&V("ExponentialBackoff",`Backing off for ${i} ms (base delay: ${this.R_} ms, delay with jitter: ${t} ms, last attempt: ${r} ms ago)`),this.V_=this.Fi.enqueueAfterDelay(this.timerId,i,(()=>(this.m_=Date.now(),e()))),this.R_*=this.E_,this.R_<this.d_&&(this.R_=this.d_),this.R_>this.A_&&(this.R_=this.A_)}y_(){this.V_!==null&&(this.V_.skipDelay(),this.V_=null)}cancel(){this.V_!==null&&(this.V_.cancel(),this.V_=null)}p_(){return(Math.random()-.5)*this.R_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ip="PersistentStream";class Ey{constructor(e,t,r,i,s,o,c,u){this.Fi=e,this.w_=r,this.S_=i,this.connection=s,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=c,this.listener=u,this.state=0,this.b_=0,this.D_=null,this.v_=null,this.stream=null,this.C_=0,this.F_=new Kl(e,t)}M_(){return this.state===1||this.state===5||this.x_()}x_(){return this.state===2||this.state===3}start(){this.C_=0,this.state!==4?this.auth():this.O_()}async stop(){this.M_()&&await this.close(0)}N_(){this.state=0,this.F_.reset()}B_(){this.x_()&&this.D_===null&&(this.D_=this.Fi.enqueueAfterDelay(this.w_,6e4,(()=>this.L_())))}k_(e){this.q_(),this.stream.send(e)}async L_(){if(this.x_())return this.close(0)}q_(){this.D_&&(this.D_.cancel(),this.D_=null)}Q_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,t){this.q_(),this.Q_(),this.F_.cancel(),this.b_++,e!==4?this.F_.reset():t&&t.code===R.RESOURCE_EXHAUSTED?(we(t.toString()),we("Using maximum backoff delay to prevent overloading the backend."),this.F_.f_()):t&&t.code===R.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.U_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.n_(t)}U_(){}auth(){this.state=1;const e=this.K_(this.b_),t=this.b_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then((([r,i])=>{this.b_===t&&this.W_(r,i)}),(r=>{e((()=>{const i=new N(R.UNKNOWN,"Fetching auth token failed: "+r.message);return this.G_(i)}))}))}W_(e,t){const r=this.K_(this.b_);this.stream=this.z_(e,t),this.stream.Zo((()=>{r((()=>this.listener.Zo()))})),this.stream.e_((()=>{r((()=>(this.state=2,this.v_=this.Fi.enqueueAfterDelay(this.S_,1e4,(()=>(this.x_()&&(this.state=3),Promise.resolve()))),this.listener.e_())))})),this.stream.n_((i=>{r((()=>this.G_(i)))})),this.stream.onMessage((i=>{r((()=>++this.C_==1?this.j_(i):this.onNext(i)))}))}O_(){this.state=5,this.F_.g_((async()=>{this.state=0,this.start()}))}G_(e){return V(Ip,`close with error: ${e}`),this.stream=null,this.close(4,e)}K_(e){return t=>{this.Fi.enqueueAndForget((()=>this.b_===e?t():(V(Ip,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve())))}}}class lP extends Ey{constructor(e,t,r,i,s,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,r,i,o),this.serializer=s}z_(e,t){return this.connection.P_("Listen",e,t)}j_(e){return this.onNext(e)}onNext(e){this.F_.reset();const t=yS(this.serializer,e),r=(function(s){if(!("targetChange"in s))return z.min();const o=s.targetChange;return o.targetIds&&o.targetIds.length?z.min():o.readTime?Ae(o.readTime):z.min()})(e);return this.listener.J_(t,r)}H_(e){const t={};t.database=Vu(this.serializer),t.addTarget=(function(s,o){let c;const u=o.target;if(c=ua(u)?{documents:q_(s,u)}:{query:Ja(s,u).Vt},c.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){c.resumeToken=L_(s,o.resumeToken);const l=Du(s,o.expectedCount);l!==null&&(c.expectedCount=l)}else if(o.snapshotVersion.compareTo(z.min())>0){c.readTime=si(s,o.snapshotVersion.toTimestamp());const l=Du(s,o.expectedCount);l!==null&&(c.expectedCount=l)}return c})(this.serializer,e);const r=TS(this.serializer,e);r&&(t.labels=r),this.k_(t)}Y_(e){const t={};t.database=Vu(this.serializer),t.removeTarget=e,this.k_(t)}}class hP extends Ey{constructor(e,t,r,i,s,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,r,i,o),this.serializer=s}get Z_(){return this.C_>0}start(){this.lastStreamToken=void 0,super.start()}U_(){this.Z_&&this.X_([])}z_(e,t){return this.connection.P_("Write",e,t)}j_(e){return $(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,$(!e.writeResults||e.writeResults.length===0,55816),this.listener.ea()}onNext(e){$(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.F_.reset();const t=IS(e.writeResults,e.commitTime),r=Ae(e.commitTime);return this.listener.ta(r,t)}na(){const e={};e.database=Vu(this.serializer),this.k_(e)}X_(e){const t={streamToken:this.lastStreamToken,writes:e.map((r=>Fs(this.serializer,r)))};this.k_(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dP{}class fP extends dP{constructor(e,t,r,i){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=r,this.serializer=i,this.ra=!1}ia(){if(this.ra)throw new N(R.FAILED_PRECONDITION,"The client has already been terminated.")}Wo(e,t,r,i){return this.ia(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([s,o])=>this.connection.Wo(e,Nu(t,r),i,s,o))).catch((s=>{throw s.name==="FirebaseError"?(s.code===R.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),s):new N(R.UNKNOWN,s.toString())}))}Jo(e,t,r,i,s){return this.ia(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([o,c])=>this.connection.Jo(e,Nu(t,r),i,o,c,s))).catch((o=>{throw o.name==="FirebaseError"?(o.code===R.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new N(R.UNKNOWN,o.toString())}))}terminate(){this.ra=!0,this.connection.terminate()}}class pP{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.sa=0,this.oa=null,this._a=!0}aa(){this.sa===0&&(this.ua("Unknown"),this.oa=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,(()=>(this.oa=null,this.ca("Backend didn't respond within 10 seconds."),this.ua("Offline"),Promise.resolve()))))}la(e){this.state==="Online"?this.ua("Unknown"):(this.sa++,this.sa>=1&&(this.ha(),this.ca(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ua("Offline")))}set(e){this.ha(),this.sa=0,e==="Online"&&(this._a=!1),this.ua(e)}ua(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}ca(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this._a?(we(t),this._a=!1):V("OnlineStateTracker",t)}ha(){this.oa!==null&&(this.oa.cancel(),this.oa=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fr="RemoteStore";class mP{constructor(e,t,r,i,s){this.localStore=e,this.datastore=t,this.asyncQueue=r,this.remoteSyncer={},this.Pa=[],this.Ta=new Map,this.Ia=new Set,this.da=[],this.Ea=s,this.Ea.xo((o=>{r.enqueueAndForget((async()=>{xn(this)&&(V(fr,"Restarting streams for network reachability change."),await(async function(u){const l=L(u);l.Ia.add(4),await vi(l),l.Aa.set("Unknown"),l.Ia.delete(4),await Zs(l)})(this))}))})),this.Aa=new pP(r,i)}}async function Zs(n){if(xn(n))for(const e of n.da)await e(!0)}async function vi(n){for(const e of n.da)await e(!1)}function nc(n,e){const t=L(n);t.Ta.has(e.targetId)||(t.Ta.set(e.targetId,e),Ql(t)?Hl(t):Ai(t).x_()&&Wl(t,e))}function ci(n,e){const t=L(n),r=Ai(t);t.Ta.delete(e),r.x_()&&vy(t,e),t.Ta.size===0&&(r.x_()?r.B_():xn(t)&&t.Aa.set("Unknown"))}function Wl(n,e){if(n.Ra.$e(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(z.min())>0){const t=n.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t)}Ai(n).H_(e)}function vy(n,e){n.Ra.$e(e),Ai(n).Y_(e)}function Hl(n){n.Ra=new hS({getRemoteKeysForTarget:e=>n.remoteSyncer.getRemoteKeysForTarget(e),Et:e=>n.Ta.get(e)||null,lt:()=>n.datastore.serializer.databaseId}),Ai(n).start(),n.Aa.aa()}function Ql(n){return xn(n)&&!Ai(n).M_()&&n.Ta.size>0}function xn(n){return L(n).Ia.size===0}function wy(n){n.Ra=void 0}async function gP(n){n.Aa.set("Online")}async function _P(n){n.Ta.forEach(((e,t)=>{Wl(n,e)}))}async function yP(n,e){wy(n),Ql(n)?(n.Aa.la(e),Hl(n)):n.Aa.set("Unknown")}async function IP(n,e,t){if(n.Aa.set("Online"),e instanceof x_&&e.state===2&&e.cause)try{await(async function(i,s){const o=s.cause;for(const c of s.targetIds)i.Ta.has(c)&&(await i.remoteSyncer.rejectListen(c,o),i.Ta.delete(c),i.Ra.removeTarget(c))})(n,e)}catch(r){V(fr,"Failed to remove targets %s: %s ",e.targetIds.join(","),r),await Ta(n,r)}else if(e instanceof Ho?n.Ra.Ye(e):e instanceof O_?n.Ra.it(e):n.Ra.et(e),!t.isEqual(z.min()))try{const r=await hy(n.localStore);t.compareTo(r)>=0&&await(function(s,o){const c=s.Ra.Pt(o);return c.targetChanges.forEach(((u,l)=>{if(u.resumeToken.approximateByteSize()>0){const d=s.Ta.get(l);d&&s.Ta.set(l,d.withResumeToken(u.resumeToken,o))}})),c.targetMismatches.forEach(((u,l)=>{const d=s.Ta.get(u);if(!d)return;s.Ta.set(u,d.withResumeToken(ye.EMPTY_BYTE_STRING,d.snapshotVersion)),vy(s,u);const p=new jt(d.target,u,l,d.sequenceNumber);Wl(s,p)})),s.remoteSyncer.applyRemoteEvent(c)})(n,t)}catch(r){V(fr,"Failed to raise snapshot:",r),await Ta(n,r)}}async function Ta(n,e,t){if(!Vn(e))throw e;n.Ia.add(1),await vi(n),n.Aa.set("Offline"),t||(t=()=>hy(n.localStore)),n.asyncQueue.enqueueRetryable((async()=>{V(fr,"Retrying IndexedDB access"),await t(),n.Ia.delete(1),await Zs(n)}))}function Ay(n,e){return e().catch((t=>Ta(n,t,e)))}async function wi(n){const e=L(n),t=Pn(e);let r=e.Pa.length>0?e.Pa[e.Pa.length-1].batchId:vn;for(;TP(e);)try{const i=await nP(e.localStore,r);if(i===null){e.Pa.length===0&&t.B_();break}r=i.batchId,EP(e,i)}catch(i){await Ta(e,i)}by(e)&&Ry(e)}function TP(n){return xn(n)&&n.Pa.length<10}function EP(n,e){n.Pa.push(e);const t=Pn(n);t.x_()&&t.Z_&&t.X_(e.mutations)}function by(n){return xn(n)&&!Pn(n).M_()&&n.Pa.length>0}function Ry(n){Pn(n).start()}async function vP(n){Pn(n).na()}async function wP(n){const e=Pn(n);for(const t of n.Pa)e.X_(t.mutations)}async function AP(n,e,t){const r=n.Pa.shift(),i=Vl.from(r,e,t);await Ay(n,(()=>n.remoteSyncer.applySuccessfulWrite(i))),await wi(n)}async function bP(n,e){e&&Pn(n).Z_&&await(async function(r,i){if((function(o){return N_(o)&&o!==R.ABORTED})(i.code)){const s=r.Pa.shift();Pn(r).N_(),await Ay(r,(()=>r.remoteSyncer.rejectFailedWrite(s.batchId,i))),await wi(r)}})(n,e),by(n)&&Ry(n)}async function Tp(n,e){const t=L(n);t.asyncQueue.verifyOperationInProgress(),V(fr,"RemoteStore received new credentials");const r=xn(t);t.Ia.add(3),await vi(t),r&&t.Aa.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.Ia.delete(3),await Zs(t)}async function Bu(n,e){const t=L(n);e?(t.Ia.delete(2),await Zs(t)):e||(t.Ia.add(2),await vi(t),t.Aa.set("Unknown"))}function Ai(n){return n.Va||(n.Va=(function(t,r,i){const s=L(t);return s.ia(),new lP(r,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)})(n.datastore,n.asyncQueue,{Zo:gP.bind(null,n),e_:_P.bind(null,n),n_:yP.bind(null,n),J_:IP.bind(null,n)}),n.da.push((async e=>{e?(n.Va.N_(),Ql(n)?Hl(n):n.Aa.set("Unknown")):(await n.Va.stop(),wy(n))}))),n.Va}function Pn(n){return n.ma||(n.ma=(function(t,r,i){const s=L(t);return s.ia(),new hP(r,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)})(n.datastore,n.asyncQueue,{Zo:()=>Promise.resolve(),e_:vP.bind(null,n),n_:bP.bind(null,n),ea:wP.bind(null,n),ta:AP.bind(null,n)}),n.da.push((async e=>{e?(n.ma.N_(),await wi(n)):(await n.ma.stop(),n.Pa.length>0&&(V(fr,`Stopping write stream with ${n.Pa.length} pending writes`),n.Pa=[]))}))),n.ma}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yl{constructor(e,t,r,i,s){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=r,this.op=i,this.removalCallback=s,this.deferred=new Oe,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch((o=>{}))}get promise(){return this.deferred.promise}static createAndSchedule(e,t,r,i,s){const o=Date.now()+r,c=new Yl(e,t,o,i,s);return c.start(r),c}start(e){this.timerHandle=setTimeout((()=>this.handleDelayElapsed()),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new N(R.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget((()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then((e=>this.deferred.resolve(e)))):Promise.resolve()))}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function bi(n,e){if(we("AsyncQueue",`${e}: ${n}`),Vn(n))return new N(R.UNAVAILABLE,`${e}: ${n}`);throw n}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ir{static emptySet(e){return new ir(e.comparator)}constructor(e){this.comparator=e?(t,r)=>e(t,r)||x.comparator(t.key,r.key):(t,r)=>x.comparator(t.key,r.key),this.keyedMap=is(),this.sortedSet=new ce(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal(((t,r)=>(e(t),!1)))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof ir)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),r=e.sortedSet.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=r.getNext().key;if(!i.isEqual(s))return!1}return!0}toString(){const e=[];return this.forEach((t=>{e.push(t.toString())})),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const r=new ir;return r.comparator=this.comparator,r.keyedMap=e,r.sortedSet=t,r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ep{constructor(){this.fa=new ce(x.comparator)}track(e){const t=e.doc.key,r=this.fa.get(t);r?e.type!==0&&r.type===3?this.fa=this.fa.insert(t,e):e.type===3&&r.type!==1?this.fa=this.fa.insert(t,{type:r.type,doc:e.doc}):e.type===2&&r.type===2?this.fa=this.fa.insert(t,{type:2,doc:e.doc}):e.type===2&&r.type===0?this.fa=this.fa.insert(t,{type:0,doc:e.doc}):e.type===1&&r.type===0?this.fa=this.fa.remove(t):e.type===1&&r.type===2?this.fa=this.fa.insert(t,{type:1,doc:r.doc}):e.type===0&&r.type===1?this.fa=this.fa.insert(t,{type:2,doc:e.doc}):q(63341,{At:e,ga:r}):this.fa=this.fa.insert(t,e)}pa(){const e=[];return this.fa.inorderTraversal(((t,r)=>{e.push(r)})),e}}class pr{constructor(e,t,r,i,s,o,c,u,l){this.query=e,this.docs=t,this.oldDocs=r,this.docChanges=i,this.mutatedKeys=s,this.fromCache=o,this.syncStateChanged=c,this.excludesMetadataChanges=u,this.hasCachedResults=l}static fromInitialDocuments(e,t,r,i,s){const o=[];return t.forEach((c=>{o.push({type:0,doc:c})})),new pr(e,t,ir.emptySet(t),o,r,i,!0,!1,s)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&Hs(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,r=e.docChanges;if(t.length!==r.length)return!1;for(let i=0;i<t.length;i++)if(t[i].type!==r[i].type||!t[i].doc.isEqual(r[i].doc))return!1;return!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class RP{constructor(){this.ya=void 0,this.wa=[]}Sa(){return this.wa.some((e=>e.ba()))}}class SP{constructor(){this.queries=vp(),this.onlineState="Unknown",this.Da=new Set}terminate(){(function(t,r){const i=L(t),s=i.queries;i.queries=vp(),s.forEach(((o,c)=>{for(const u of c.wa)u.onError(r)}))})(this,new N(R.ABORTED,"Firestore shutting down"))}}function vp(){return new en((n=>__(n)),Hs)}async function Jl(n,e){const t=L(n);let r=3;const i=e.query;let s=t.queries.get(i);s?!s.Sa()&&e.ba()&&(r=2):(s=new RP,r=e.ba()?0:1);try{switch(r){case 0:s.ya=await t.onListen(i,!0);break;case 1:s.ya=await t.onListen(i,!1);break;case 2:await t.onFirstRemoteStoreListen(i)}}catch(o){const c=bi(o,`Initialization of query '${Mr(e.query)}' failed`);return void e.onError(c)}t.queries.set(i,s),s.wa.push(e),e.va(t.onlineState),s.ya&&e.Ca(s.ya)&&Zl(t)}async function Xl(n,e){const t=L(n),r=e.query;let i=3;const s=t.queries.get(r);if(s){const o=s.wa.indexOf(e);o>=0&&(s.wa.splice(o,1),s.wa.length===0?i=e.ba()?0:1:!s.Sa()&&e.ba()&&(i=2))}switch(i){case 0:return t.queries.delete(r),t.onUnlisten(r,!0);case 1:return t.queries.delete(r),t.onUnlisten(r,!1);case 2:return t.onLastRemoteStoreUnlisten(r);default:return}}function PP(n,e){const t=L(n);let r=!1;for(const i of e){const s=i.query,o=t.queries.get(s);if(o){for(const c of o.wa)c.Ca(i)&&(r=!0);o.ya=i}}r&&Zl(t)}function CP(n,e,t){const r=L(n),i=r.queries.get(e);if(i)for(const s of i.wa)s.onError(t);r.queries.delete(e)}function Zl(n){n.Da.forEach((e=>{e.next()}))}var qu,wp;(wp=qu||(qu={})).Fa="default",wp.Cache="cache";class eh{constructor(e,t,r){this.query=e,this.Ma=t,this.xa=!1,this.Oa=null,this.onlineState="Unknown",this.options=r||{}}Ca(e){if(!this.options.includeMetadataChanges){const r=[];for(const i of e.docChanges)i.type!==3&&r.push(i);e=new pr(e.query,e.docs,e.oldDocs,r,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.xa?this.Na(e)&&(this.Ma.next(e),t=!0):this.Ba(e,this.onlineState)&&(this.La(e),t=!0),this.Oa=e,t}onError(e){this.Ma.error(e)}va(e){this.onlineState=e;let t=!1;return this.Oa&&!this.xa&&this.Ba(this.Oa,e)&&(this.La(this.Oa),t=!0),t}Ba(e,t){if(!e.fromCache||!this.ba())return!0;const r=t!=="Offline";return(!this.options.ka||!r)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}Na(e){if(e.docChanges.length>0)return!0;const t=this.Oa&&this.Oa.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}La(e){e=pr.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.xa=!0,this.Ma.next(e)}ba(){return this.options.source!==qu.Cache}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sy{constructor(e,t){this.qa=e,this.byteLength=t}Qa(){return"metadata"in this.qa}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ap{constructor(e){this.serializer=e}Qs(e){return Ct(this.serializer,e)}$s(e){return e.metadata.exists?Ya(this.serializer,e.document,!1):le.newNoDocument(this.Qs(e.metadata.name),this.Us(e.metadata.readTime))}Us(e){return Ae(e)}}class th{constructor(e,t){this.$a=e,this.serializer=t,this.Ua=[],this.Ka=[],this.collectionGroups=new Set,this.progress=Py(e)}get queries(){return this.Ua}get documents(){return this.Ka}Wa(e){this.progress.bytesLoaded+=e.byteLength;let t=this.progress.documentsLoaded;if(e.qa.namedQuery)this.Ua.push(e.qa.namedQuery);else if(e.qa.documentMetadata){this.Ka.push({metadata:e.qa.documentMetadata}),e.qa.documentMetadata.exists||++t;const r=Q.fromString(e.qa.documentMetadata.name);this.collectionGroups.add(r.get(r.length-2))}else e.qa.document&&(this.Ka[this.Ka.length-1].document=e.qa.document,++t);return t!==this.progress.documentsLoaded?(this.progress.documentsLoaded=t,Object.assign({},this.progress)):null}Ga(e){const t=new Map,r=new Ap(this.serializer);for(const i of e)if(i.metadata.queries){const s=r.Qs(i.metadata.name);for(const o of i.metadata.queries){const c=(t.get(o)||H()).add(s);t.set(o,c)}}return t}async za(e){const t=await rP(e,new Ap(this.serializer),this.Ka,this.$a.id),r=this.Ga(this.documents);for(const i of this.Ua)await iP(e,i,r.get(i.name));return this.progress.taskState="Success",{progress:this.progress,ja:this.collectionGroups,Ja:t}}}function Py(n){return{taskState:"Running",documentsLoaded:0,bytesLoaded:0,totalDocuments:n.totalDocuments,totalBytes:n.totalBytes}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cy{constructor(e){this.key=e}}class ky{constructor(e){this.key=e}}class Dy{constructor(e,t){this.query=e,this.Ha=t,this.Ya=null,this.hasCachedResults=!1,this.current=!1,this.Za=H(),this.mutatedKeys=H(),this.Xa=I_(e),this.eu=new ir(this.Xa)}get tu(){return this.Ha}nu(e,t){const r=t?t.ru:new Ep,i=t?t.eu:this.eu;let s=t?t.mutatedKeys:this.mutatedKeys,o=i,c=!1;const u=this.query.limitType==="F"&&i.size===this.query.limit?i.last():null,l=this.query.limitType==="L"&&i.size===this.query.limit?i.first():null;if(e.inorderTraversal(((d,p)=>{const m=i.get(d),T=Qs(this.query,p)?p:null,P=!!m&&this.mutatedKeys.has(m.key),D=!!T&&(T.hasLocalMutations||this.mutatedKeys.has(T.key)&&T.hasCommittedMutations);let k=!1;m&&T?m.data.isEqual(T.data)?P!==D&&(r.track({type:3,doc:T}),k=!0):this.iu(m,T)||(r.track({type:2,doc:T}),k=!0,(u&&this.Xa(T,u)>0||l&&this.Xa(T,l)<0)&&(c=!0)):!m&&T?(r.track({type:0,doc:T}),k=!0):m&&!T&&(r.track({type:1,doc:m}),k=!0,(u||l)&&(c=!0)),k&&(T?(o=o.add(T),s=D?s.add(d):s.delete(d)):(o=o.delete(d),s=s.delete(d)))})),this.query.limit!==null)for(;o.size>this.query.limit;){const d=this.query.limitType==="F"?o.last():o.first();o=o.delete(d.key),s=s.delete(d.key),r.track({type:1,doc:d})}return{eu:o,ru:r,Ds:c,mutatedKeys:s}}iu(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,r,i){const s=this.eu;this.eu=e.eu,this.mutatedKeys=e.mutatedKeys;const o=e.ru.pa();o.sort(((d,p)=>(function(T,P){const D=k=>{switch(k){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return q(20277,{At:k})}};return D(T)-D(P)})(d.type,p.type)||this.Xa(d.doc,p.doc))),this.su(r),i=i!=null&&i;const c=t&&!i?this.ou():[],u=this.Za.size===0&&this.current&&!i?1:0,l=u!==this.Ya;return this.Ya=u,o.length!==0||l?{snapshot:new pr(this.query,e.eu,s,o,e.mutatedKeys,u===0,l,!1,!!r&&r.resumeToken.approximateByteSize()>0),_u:c}:{_u:c}}va(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({eu:this.eu,ru:new Ep,mutatedKeys:this.mutatedKeys,Ds:!1},!1)):{_u:[]}}au(e){return!this.Ha.has(e)&&!!this.eu.has(e)&&!this.eu.get(e).hasLocalMutations}su(e){e&&(e.addedDocuments.forEach((t=>this.Ha=this.Ha.add(t))),e.modifiedDocuments.forEach((t=>{})),e.removedDocuments.forEach((t=>this.Ha=this.Ha.delete(t))),this.current=e.current)}ou(){if(!this.current)return[];const e=this.Za;this.Za=H(),this.eu.forEach((r=>{this.au(r.key)&&(this.Za=this.Za.add(r.key))}));const t=[];return e.forEach((r=>{this.Za.has(r)||t.push(new ky(r))})),this.Za.forEach((r=>{e.has(r)||t.push(new Cy(r))})),t}uu(e){this.Ha=e.qs,this.Za=H();const t=this.nu(e.documents);return this.applyChanges(t,!0)}cu(){return pr.fromInitialDocuments(this.query,this.eu,this.mutatedKeys,this.Ya===0,this.hasCachedResults)}}const Ln="SyncEngine";class kP{constructor(e,t,r){this.query=e,this.targetId=t,this.view=r}}class DP{constructor(e){this.key=e,this.lu=!1}}class NP{constructor(e,t,r,i,s,o){this.localStore=e,this.remoteStore=t,this.eventManager=r,this.sharedClientState=i,this.currentUser=s,this.maxConcurrentLimboResolutions=o,this.hu={},this.Pu=new en((c=>__(c)),Hs),this.Tu=new Map,this.Iu=new Set,this.du=new ce(x.comparator),this.Eu=new Map,this.Au=new Ul,this.Ru={},this.Vu=new Map,this.mu=dr.ur(),this.onlineState="Unknown",this.fu=void 0}get isPrimaryClient(){return this.fu===!0}}async function VP(n,e,t=!0){const r=rc(n);let i;const s=r.Pu.get(e);return s?(r.sharedClientState.addLocalQueryTarget(s.targetId),i=s.view.cu()):i=await Ny(r,e,t,!0),i}async function OP(n,e){const t=rc(n);await Ny(t,e,!0,!1)}async function Ny(n,e,t,r){const i=await oi(n.localStore,Ge(e)),s=i.targetId,o=n.sharedClientState.addLocalQueryTarget(s,t);let c;return r&&(c=await nh(n,e,s,o==="current",i.resumeToken)),n.isPrimaryClient&&t&&nc(n.remoteStore,i),c}async function nh(n,e,t,r,i){n.gu=(p,m,T)=>(async function(D,k,U,B){let M=k.view.nu(U);M.Ds&&(M=await _a(D.localStore,k.query,!1).then((({documents:E})=>k.view.nu(E,M))));const G=B&&B.targetChanges.get(k.targetId),J=B&&B.targetMismatches.get(k.targetId)!=null,W=k.view.applyChanges(M,D.isPrimaryClient,G,J);return ju(D,k.targetId,W._u),W.snapshot})(n,p,m,T);const s=await _a(n.localStore,e,!0),o=new Dy(e,s.qs),c=o.nu(s.documents),u=Xs.createSynthesizedTargetChangeForCurrentChange(t,r&&n.onlineState!=="Offline",i),l=o.applyChanges(c,n.isPrimaryClient,u);ju(n,t,l._u);const d=new kP(e,t,o);return n.Pu.set(e,d),n.Tu.has(t)?n.Tu.get(t).push(e):n.Tu.set(t,[e]),l.snapshot}async function xP(n,e,t){const r=L(n),i=r.Pu.get(e),s=r.Tu.get(i.targetId);if(s.length>1)return r.Tu.set(i.targetId,s.filter((o=>!Hs(o,e)))),void r.Pu.delete(e);r.isPrimaryClient?(r.sharedClientState.removeLocalQueryTarget(i.targetId),r.sharedClientState.isActiveQueryTarget(i.targetId)||await ai(r.localStore,i.targetId,!1).then((()=>{r.sharedClientState.clearQueryState(i.targetId),t&&ci(r.remoteStore,i.targetId),ui(r,i.targetId)})).catch(Nn)):(ui(r,i.targetId),await ai(r.localStore,i.targetId,!0))}async function LP(n,e){const t=L(n),r=t.Pu.get(e),i=t.Tu.get(r.targetId);t.isPrimaryClient&&i.length===1&&(t.sharedClientState.removeLocalQueryTarget(r.targetId),ci(t.remoteStore,r.targetId))}async function MP(n,e,t){const r=oh(n);try{const i=await(function(o,c){const u=L(o),l=ne.now(),d=c.reduce(((T,P)=>T.add(P.key)),H());let p,m;return u.persistence.runTransaction("Locally write mutations","readwrite",(T=>{let P=et(),D=H();return u.Os.getEntries(T,d).next((k=>{P=k,P.forEach(((U,B)=>{B.isValidDocument()||(D=D.add(U))}))})).next((()=>u.localDocuments.getOverlayedDocuments(T,P))).next((k=>{p=k;const U=[];for(const B of c){const M=cS(B,p.get(B.key).overlayedDocument);M!=null&&U.push(new tn(B.key,M,o_(M.value.mapValue),ge.exists(!0)))}return u.mutationQueue.addMutationBatch(T,l,U,c)})).next((k=>{m=k;const U=k.applyToLocalDocumentSet(p,D);return u.documentOverlayCache.saveOverlays(T,k.batchId,U)}))})).then((()=>({batchId:m.batchId,changes:E_(p)})))})(r.localStore,e);r.sharedClientState.addPendingMutation(i.batchId),(function(o,c,u){let l=o.Ru[o.currentUser.toKey()];l||(l=new ce(K)),l=l.insert(c,u),o.Ru[o.currentUser.toKey()]=l})(r,i.batchId,t),await nn(r,i.changes),await wi(r.remoteStore)}catch(i){const s=bi(i,"Failed to persist write");t.reject(s)}}async function Vy(n,e){const t=L(n);try{const r=await tP(t.localStore,e);e.targetChanges.forEach(((i,s)=>{const o=t.Eu.get(s);o&&($(i.addedDocuments.size+i.modifiedDocuments.size+i.removedDocuments.size<=1,22616),i.addedDocuments.size>0?o.lu=!0:i.modifiedDocuments.size>0?$(o.lu,14607):i.removedDocuments.size>0&&($(o.lu,42227),o.lu=!1))})),await nn(t,r,e)}catch(r){await Nn(r)}}function bp(n,e,t){const r=L(n);if(r.isPrimaryClient&&t===0||!r.isPrimaryClient&&t===1){const i=[];r.Pu.forEach(((s,o)=>{const c=o.view.va(e);c.snapshot&&i.push(c.snapshot)})),(function(o,c){const u=L(o);u.onlineState=c;let l=!1;u.queries.forEach(((d,p)=>{for(const m of p.wa)m.va(c)&&(l=!0)})),l&&Zl(u)})(r.eventManager,e),i.length&&r.hu.J_(i),r.onlineState=e,r.isPrimaryClient&&r.sharedClientState.setOnlineState(e)}}async function FP(n,e,t){const r=L(n);r.sharedClientState.updateQueryState(e,"rejected",t);const i=r.Eu.get(e),s=i&&i.key;if(s){let o=new ce(x.comparator);o=o.insert(s,le.newNoDocument(s,z.min()));const c=H().add(s),u=new Js(z.min(),new Map,new ce(K),o,c);await Vy(r,u),r.du=r.du.remove(s),r.Eu.delete(e),sh(r)}else await ai(r.localStore,e,!1).then((()=>ui(r,e,t))).catch(Nn)}async function UP(n,e){const t=L(n),r=e.batch.batchId;try{const i=await eP(t.localStore,e);ih(t,r,null),rh(t,r),t.sharedClientState.updateMutationState(r,"acknowledged"),await nn(t,i)}catch(i){await Nn(i)}}async function BP(n,e,t){const r=L(n);try{const i=await(function(o,c){const u=L(o);return u.persistence.runTransaction("Reject batch","readwrite-primary",(l=>{let d;return u.mutationQueue.lookupMutationBatch(l,c).next((p=>($(p!==null,37113),d=p.keys(),u.mutationQueue.removeMutationBatch(l,p)))).next((()=>u.mutationQueue.performConsistencyCheck(l))).next((()=>u.documentOverlayCache.removeOverlaysForBatchId(l,d,c))).next((()=>u.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(l,d))).next((()=>u.localDocuments.getDocuments(l,d)))}))})(r.localStore,e);ih(r,e,t),rh(r,e),r.sharedClientState.updateMutationState(e,"rejected",t),await nn(r,i)}catch(i){await Nn(i)}}async function qP(n,e){const t=L(n);xn(t.remoteStore)||V(Ln,"The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled.");try{const r=await(function(o){const c=L(o);return c.persistence.runTransaction("Get highest unacknowledged batch id","readonly",(u=>c.mutationQueue.getHighestUnacknowledgedBatchId(u)))})(t.localStore);if(r===vn)return void e.resolve();const i=t.Vu.get(r)||[];i.push(e),t.Vu.set(r,i)}catch(r){const i=bi(r,"Initialization of waitForPendingWrites() operation failed");e.reject(i)}}function rh(n,e){(n.Vu.get(e)||[]).forEach((t=>{t.resolve()})),n.Vu.delete(e)}function ih(n,e,t){const r=L(n);let i=r.Ru[r.currentUser.toKey()];if(i){const s=i.get(e);s&&(t?s.reject(t):s.resolve(),i=i.remove(e)),r.Ru[r.currentUser.toKey()]=i}}function ui(n,e,t=null){n.sharedClientState.removeLocalQueryTarget(e);for(const r of n.Tu.get(e))n.Pu.delete(r),t&&n.hu.pu(r,t);n.Tu.delete(e),n.isPrimaryClient&&n.Au.zr(e).forEach((r=>{n.Au.containsKey(r)||Oy(n,r)}))}function Oy(n,e){n.Iu.delete(e.path.canonicalString());const t=n.du.get(e);t!==null&&(ci(n.remoteStore,t),n.du=n.du.remove(e),n.Eu.delete(t),sh(n))}function ju(n,e,t){for(const r of t)r instanceof Cy?(n.Au.addReference(r.key,e),jP(n,r)):r instanceof ky?(V(Ln,"Document no longer in limbo: "+r.key),n.Au.removeReference(r.key,e),n.Au.containsKey(r.key)||Oy(n,r.key)):q(19791,{yu:r})}function jP(n,e){const t=e.key,r=t.path.canonicalString();n.du.get(t)||n.Iu.has(r)||(V(Ln,"New document in limbo: "+t),n.Iu.add(r),sh(n))}function sh(n){for(;n.Iu.size>0&&n.du.size<n.maxConcurrentLimboResolutions;){const e=n.Iu.values().next().value;n.Iu.delete(e);const t=new x(Q.fromString(e)),r=n.mu.next();n.Eu.set(r,new DP(t)),n.du=n.du.insert(t,r),nc(n.remoteStore,new jt(Ge(Ii(t.path)),r,"TargetPurposeLimboResolution",Xe.ue))}}async function nn(n,e,t){const r=L(n),i=[],s=[],o=[];r.Pu.isEmpty()||(r.Pu.forEach(((c,u)=>{o.push(r.gu(u,e,t).then((l=>{var d;if((l||t)&&r.isPrimaryClient){const p=l?!l.fromCache:(d=t==null?void 0:t.targetChanges.get(u.targetId))===null||d===void 0?void 0:d.current;r.sharedClientState.updateQueryState(u.targetId,p?"current":"not-current")}if(l){i.push(l);const p=$l.Es(u.targetId,l);s.push(p)}})))})),await Promise.all(o),r.hu.J_(i),await(async function(u,l){const d=L(u);try{await d.persistence.runTransaction("notifyLocalViewChanges","readwrite",(p=>A.forEach(l,(m=>A.forEach(m.Is,(T=>d.persistence.referenceDelegate.addReference(p,m.targetId,T))).next((()=>A.forEach(m.ds,(T=>d.persistence.referenceDelegate.removeReference(p,m.targetId,T)))))))))}catch(p){if(!Vn(p))throw p;V(zl,"Failed to update sequence numbers: "+p)}for(const p of l){const m=p.targetId;if(!p.fromCache){const T=d.Fs.get(m),P=T.snapshotVersion,D=T.withLastLimboFreeSnapshotVersion(P);d.Fs=d.Fs.insert(m,D)}}})(r.localStore,s))}async function $P(n,e){const t=L(n);if(!t.currentUser.isEqual(e)){V(Ln,"User change. New user:",e.toKey());const r=await ly(t.localStore,e);t.currentUser=e,(function(s,o){s.Vu.forEach((c=>{c.forEach((u=>{u.reject(new N(R.CANCELLED,o))}))})),s.Vu.clear()})(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,r.removedBatchIds,r.addedBatchIds),await nn(t,r.Bs)}}function zP(n,e){const t=L(n),r=t.Eu.get(e);if(r&&r.lu)return H().add(r.key);{let i=H();const s=t.Tu.get(e);if(!s)return i;for(const o of s){const c=t.Pu.get(o);i=i.unionWith(c.view.tu)}return i}}async function GP(n,e){const t=L(n),r=await _a(t.localStore,e.query,!0),i=e.view.uu(r);return t.isPrimaryClient&&ju(t,e.targetId,i._u),i}async function KP(n,e){const t=L(n);return py(t.localStore,e).then((r=>nn(t,r)))}async function WP(n,e,t,r){const i=L(n),s=await(function(c,u){const l=L(c),d=L(l.mutationQueue);return l.persistence.runTransaction("Lookup mutation documents","readonly",(p=>d.Xn(p,u).next((m=>m?l.localDocuments.getDocuments(p,m):A.resolve(null)))))})(i.localStore,e);s!==null?(t==="pending"?await wi(i.remoteStore):t==="acknowledged"||t==="rejected"?(ih(i,e,r||null),rh(i,e),(function(c,u){L(L(c).mutationQueue).rr(u)})(i.localStore,e)):q(6720,"Unknown batchState",{wu:t}),await nn(i,s)):V(Ln,"Cannot apply mutation batch with id: "+e)}async function HP(n,e){const t=L(n);if(rc(t),oh(t),e===!0&&t.fu!==!0){const r=t.sharedClientState.getAllActiveQueryTargets(),i=await Rp(t,r.toArray());t.fu=!0,await Bu(t.remoteStore,!0);for(const s of i)nc(t.remoteStore,s)}else if(e===!1&&t.fu!==!1){const r=[];let i=Promise.resolve();t.Tu.forEach(((s,o)=>{t.sharedClientState.isLocalQueryTarget(o)?r.push(o):i=i.then((()=>(ui(t,o),ai(t.localStore,o,!0)))),ci(t.remoteStore,o)})),await i,await Rp(t,r),(function(o){const c=L(o);c.Eu.forEach(((u,l)=>{ci(c.remoteStore,l)})),c.Au.jr(),c.Eu=new Map,c.du=new ce(x.comparator)})(t),t.fu=!1,await Bu(t.remoteStore,!1)}}async function Rp(n,e,t){const r=L(n),i=[],s=[];for(const o of e){let c;const u=r.Tu.get(o);if(u&&u.length!==0){c=await oi(r.localStore,Ge(u[0]));for(const l of u){const d=r.Pu.get(l),p=await GP(r,d);p.snapshot&&s.push(p.snapshot)}}else{const l=await fy(r.localStore,o);c=await oi(r.localStore,l),await nh(r,xy(l),o,!1,c.resumeToken)}i.push(c)}return r.hu.J_(s),i}function xy(n){return p_(n.path,n.collectionGroup,n.orderBy,n.filters,n.limit,"F",n.startAt,n.endAt)}function QP(n){return(function(t){return L(L(t).persistence).Ps()})(L(n).localStore)}async function YP(n,e,t,r){const i=L(n);if(i.fu)return void V(Ln,"Ignoring unexpected query state notification.");const s=i.Tu.get(e);if(s&&s.length>0)switch(t){case"current":case"not-current":{const o=await py(i.localStore,y_(s[0])),c=Js.createSynthesizedRemoteEventForCurrentChange(e,t==="current",ye.EMPTY_BYTE_STRING);await nn(i,o,c);break}case"rejected":await ai(i.localStore,e,!0),ui(i,e,r);break;default:q(64155,t)}}async function JP(n,e,t){const r=rc(n);if(r.fu){for(const i of e){if(r.Tu.has(i)&&r.sharedClientState.isActiveQueryTarget(i)){V(Ln,"Adding an already active target "+i);continue}const s=await fy(r.localStore,i),o=await oi(r.localStore,s);await nh(r,xy(s),o.targetId,!1,o.resumeToken),nc(r.remoteStore,o)}for(const i of t)r.Tu.has(i)&&await ai(r.localStore,i,!1).then((()=>{ci(r.remoteStore,i),ui(r,i)})).catch(Nn)}}function rc(n){const e=L(n);return e.remoteStore.remoteSyncer.applyRemoteEvent=Vy.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=zP.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=FP.bind(null,e),e.hu.J_=PP.bind(null,e.eventManager),e.hu.pu=CP.bind(null,e.eventManager),e}function oh(n){const e=L(n);return e.remoteStore.remoteSyncer.applySuccessfulWrite=UP.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=BP.bind(null,e),e}function XP(n,e,t){const r=L(n);(async function(s,o,c){try{const u=await o.getMetadata();if(await(function(T,P){const D=L(T),k=Ae(P.createTime);return D.persistence.runTransaction("hasNewerBundle","readonly",(U=>D.Ti.getBundleMetadata(U,P.id))).then((U=>!!U&&U.createTime.compareTo(k)>=0))})(s.localStore,u))return await o.close(),c._completeWith((function(T){return{taskState:"Success",documentsLoaded:T.totalDocuments,bytesLoaded:T.totalBytes,totalDocuments:T.totalDocuments,totalBytes:T.totalBytes}})(u)),Promise.resolve(new Set);c._updateProgress(Py(u));const l=new th(u,o.serializer);let d=await o.Su();for(;d;){const m=await l.Wa(d);m&&c._updateProgress(m),d=await o.Su()}const p=await l.za(s.localStore);return await nn(s,p.Ja,void 0),await(function(T,P){const D=L(T);return D.persistence.runTransaction("Save bundle","readwrite",(k=>D.Ti.saveBundleMetadata(k,P)))})(s.localStore,u),c._completeWith(p.progress),Promise.resolve(p.ja)}catch(u){return Ke(Ln,`Loading bundle failed with ${u}`),c._failWith(u),Promise.resolve(new Set)}})(r,e,t).then((i=>{r.sharedClientState.notifyBundleLoaded(i)}))}class li{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=vr(e.databaseInfo.databaseId),this.sharedClientState=this.bu(e),this.persistence=this.Du(e),await this.persistence.start(),this.localStore=this.vu(e),this.gcScheduler=this.Cu(e,this.localStore),this.indexBackfillerScheduler=this.Fu(e,this.localStore)}Cu(e,t){return null}Fu(e,t){return null}vu(e){return uy(this.persistence,new cy,e.initialUser,this.serializer)}Du(e){return new Bl(tc.Vi,this.serializer)}bu(e){return new Iy}async terminate(){var e,t;(e=this.gcScheduler)===null||e===void 0||e.stop(),(t=this.indexBackfillerScheduler)===null||t===void 0||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}li.provider={build:()=>new li};class ah extends li{constructor(e){super(),this.cacheSizeBytes=e}Cu(e,t){$(this.persistence.referenceDelegate instanceof ga,46915);const r=this.persistence.referenceDelegate.garbageCollector;return new ny(r,e.asyncQueue,t)}Du(e){const t=this.cacheSizeBytes!==void 0?$e.withCacheSize(this.cacheSizeBytes):$e.DEFAULT;return new Bl((r=>ga.Vi(r,t)),this.serializer)}}class ch extends li{constructor(e,t,r){super(),this.Mu=e,this.cacheSizeBytes=t,this.forceOwnership=r,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.Mu.initialize(this,e),await oh(this.Mu.syncEngine),await wi(this.Mu.remoteStore),await this.persistence.ji((()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve())))}vu(e){return uy(this.persistence,new cy,e.initialUser,this.serializer)}Cu(e,t){const r=this.persistence.referenceDelegate.garbageCollector;return new ny(r,e.asyncQueue,t)}Fu(e,t){const r=new dR(t,this.persistence);return new hR(e.asyncQueue,r)}Du(e){const t=jl(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),r=this.cacheSizeBytes!==void 0?$e.withCacheSize(this.cacheSizeBytes):$e.DEFAULT;return new ql(this.synchronizeTabs,t,e.clientId,r,e.asyncQueue,Ty(),Yo(),this.serializer,this.sharedClientState,!!this.forceOwnership)}bu(e){return new Iy}}class Ly extends ch{constructor(e,t){super(e,t,!1),this.Mu=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.Mu.syncEngine;this.sharedClientState instanceof tu&&(this.sharedClientState.syncEngine={Do:WP.bind(null,t),vo:YP.bind(null,t),Co:JP.bind(null,t),Ps:QP.bind(null,t),bo:KP.bind(null,t)},await this.sharedClientState.start()),await this.persistence.ji((async r=>{await HP(this.Mu.syncEngine,r),this.gcScheduler&&(r&&!this.gcScheduler.started?this.gcScheduler.start():r||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(r&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():r||this.indexBackfillerScheduler.stop())}))}bu(e){const t=Ty();if(!tu.C(t))throw new N(R.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const r=jl(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new tu(t,e.asyncQueue,r,e.clientId,e.initialUser)}}class Cn{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=r=>bp(this.syncEngine,r,1),this.remoteStore.remoteSyncer.handleCredentialChange=$P.bind(null,this.syncEngine),await Bu(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return(function(){return new SP})()}createDatastore(e){const t=vr(e.databaseInfo.databaseId),r=(function(s){return new uP(s)})(e.databaseInfo);return(function(s,o,c,u){return new fP(s,o,c,u)})(e.authCredentials,e.appCheckCredentials,r,t)}createRemoteStore(e){return(function(r,i,s,o,c){return new mP(r,i,s,o,c)})(this.localStore,this.datastore,e.asyncQueue,(t=>bp(this.syncEngine,t,0)),(function(){return yp.C()?new yp:new sP})())}createSyncEngine(e,t){return(function(i,s,o,c,u,l,d){const p=new NP(i,s,o,c,u,l);return d&&(p.fu=!0),p})(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await(async function(i){const s=L(i);V(fr,"RemoteStore shutting down."),s.Ia.add(5),await vi(s),s.Ea.shutdown(),s.Aa.set("Unknown")})(this.remoteStore),(e=this.datastore)===null||e===void 0||e.terminate(),(t=this.eventManager)===null||t===void 0||t.terminate()}}Cn.provider={build:()=>new Cn};function Sp(n,e=10240){let t=0;return{async read(){if(t<n.byteLength){const r={value:n.slice(t,t+e),done:!1};return t+=e,r}return{done:!0}},async cancel(){},releaseLock(){},closed:Promise.resolve()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ic{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.xu(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.xu(this.observer.error,e):we("Uncaught Error in snapshot listener:",e.toString()))}Ou(){this.muted=!0}xu(e,t){setTimeout((()=>{this.muted||e(t)}),0)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ZP{constructor(e,t){this.Nu=e,this.serializer=t,this.metadata=new Oe,this.buffer=new Uint8Array,this.Bu=(function(){return new TextDecoder("utf-8")})(),this.Lu().then((r=>{r&&r.Qa()?this.metadata.resolve(r.qa.metadata):this.metadata.reject(new Error(`The first element of the bundle is not a metadata, it is
             ${JSON.stringify(r==null?void 0:r.qa)}`))}),(r=>this.metadata.reject(r)))}close(){return this.Nu.cancel()}async getMetadata(){return this.metadata.promise}async Su(){return await this.getMetadata(),this.Lu()}async Lu(){const e=await this.ku();if(e===null)return null;const t=this.Bu.decode(e),r=Number(t);isNaN(r)&&this.qu(`length string (${t}) is not valid number`);const i=await this.Qu(r);return new Sy(JSON.parse(i),e.length+r)}$u(){return this.buffer.findIndex((e=>e===123))}async ku(){for(;this.$u()<0&&!await this.Uu(););if(this.buffer.length===0)return null;const e=this.$u();e<0&&this.qu("Reached the end of bundle when a length string is expected.");const t=this.buffer.slice(0,e);return this.buffer=this.buffer.slice(e),t}async Qu(e){for(;this.buffer.length<e;)await this.Uu()&&this.qu("Reached the end of bundle when more is expected.");const t=this.Bu.decode(this.buffer.slice(0,e));return this.buffer=this.buffer.slice(e),t}qu(e){throw this.Nu.cancel(),new Error(`Invalid bundle format: ${e}`)}async Uu(){const e=await this.Nu.read();if(!e.done){const t=new Uint8Array(this.buffer.length+e.value.length);t.set(this.buffer),t.set(e.value,this.buffer.length),this.buffer=t}return e.done}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eC{constructor(e,t){this.bundleData=e,this.serializer=t,this.cursor=0,this.elements=[];let r=this.Su();if(!r||!r.Qa())throw new Error(`The first element of the bundle is not a metadata object, it is
         ${JSON.stringify(r==null?void 0:r.qa)}`);this.metadata=r;do r=this.Su(),r!==null&&this.elements.push(r);while(r!==null)}getMetadata(){return this.metadata}Ku(){return this.elements}Su(){if(this.cursor===this.bundleData.length)return null;const e=this.ku(),t=this.Qu(e);return new Sy(JSON.parse(t),e)}Qu(e){if(this.cursor+e>this.bundleData.length)throw new N(R.INTERNAL,"Reached the end of bundle when more is expected.");return this.bundleData.slice(this.cursor,this.cursor+=e)}ku(){const e=this.cursor;let t=this.cursor;for(;t<this.bundleData.length;){if(this.bundleData[t]==="{"){if(t===e)throw new Error("First character is a bracket and not a number");return this.cursor=t,Number(this.bundleData.slice(e,t))}t++}throw new Error("Reached the end of bundle when more is expected.")}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tC{constructor(e){this.datastore=e,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new N(R.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;const t=await(async function(i,s){const o=L(i),c={documents:s.map((p=>Ms(o.serializer,p)))},u=await o.Jo("BatchGetDocuments",o.serializer.databaseId,Q.emptyPath(),c,s.length),l=new Map;u.forEach((p=>{const m=_S(o.serializer,p);l.set(m.key.toString(),m)}));const d=[];return s.forEach((p=>{const m=l.get(p.toString());$(!!m,55234,{key:p}),d.push(m)})),d})(this.datastore,e);return t.forEach((r=>this.recordVersion(r))),t}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString())}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)))}catch(r){this.lastTransactionError=r}this.writtenDocs.add(e.toString())}delete(e){this.write(new Ei(e,this.precondition(e))),this.writtenDocs.add(e.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;const e=this.readVersions;this.mutations.forEach((t=>{e.delete(t.key.toString())})),e.forEach(((t,r)=>{const i=x.fromPath(r);this.mutations.push(new Dl(i,this.precondition(i)))})),await(async function(r,i){const s=L(r),o={writes:i.map((c=>Fs(s.serializer,c)))};await s.Wo("Commit",s.serializer.databaseId,Q.emptyPath(),o)})(this.datastore,this.mutations),this.committed=!0}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw q(50498,{Wu:e.constructor.name});t=z.min()}const r=this.readVersions.get(e.key.toString());if(r){if(!t.isEqual(r))throw new N(R.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(e.key.toString(),t)}precondition(e){const t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual(z.min())?ge.exists(!1):ge.updateTime(t):ge.none()}preconditionForUpdate(e){const t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual(z.min()))throw new N(R.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return ge.updateTime(t)}return ge.exists(!0)}write(e){this.ensureCommitNotCalled(),this.mutations.push(e)}ensureCommitNotCalled(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nC{constructor(e,t,r,i,s){this.asyncQueue=e,this.datastore=t,this.options=r,this.updateFunction=i,this.deferred=s,this.Gu=r.maxAttempts,this.F_=new Kl(this.asyncQueue,"transaction_retry")}zu(){this.Gu-=1,this.ju()}ju(){this.F_.g_((async()=>{const e=new tC(this.datastore),t=this.Ju(e);t&&t.then((r=>{this.asyncQueue.enqueueAndForget((()=>e.commit().then((()=>{this.deferred.resolve(r)})).catch((i=>{this.Hu(i)}))))})).catch((r=>{this.Hu(r)}))}))}Ju(e){try{const t=this.updateFunction(e);return!Gs(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}Hu(e){this.Gu>0&&this.Yu(e)?(this.Gu-=1,this.asyncQueue.enqueueAndForget((()=>(this.ju(),Promise.resolve())))):this.deferred.reject(e)}Yu(e){if(e.name==="FirebaseError"){const t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!N_(t)}return!1}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kn="FirestoreClient";class rC{constructor(e,t,r,i,s){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=r,this.databaseInfo=i,this.user=Ne.UNAUTHENTICATED,this.clientId=Ua.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=s,this.authCredentials.start(r,(async o=>{V(kn,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o})),this.appCheckCredentials.start(r,(o=>(V(kn,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user))))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new Oe;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted((async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const r=bi(t,"Failed to shutdown persistence");e.reject(r)}})),e.promise}}async function ru(n,e){n.asyncQueue.verifyOperationInProgress(),V(kn,"Initializing OfflineComponentProvider");const t=n.configuration;await e.initialize(t);let r=t.initialUser;n.setCredentialChangeListener((async i=>{r.isEqual(i)||(await ly(e.localStore,i),r=i)})),e.persistence.setDatabaseDeletedListener((()=>{Ke("Terminating Firestore due to IndexedDb database deletion"),n.terminate().then((()=>{V("Terminating Firestore due to IndexedDb database deletion completed successfully")})).catch((i=>{Ke("Terminating Firestore due to IndexedDb database deletion failed",i)}))})),n._offlineComponents=e}async function Pp(n,e){n.asyncQueue.verifyOperationInProgress();const t=await uh(n);V(kn,"Initializing OnlineComponentProvider"),await e.initialize(t,n.configuration),n.setCredentialChangeListener((r=>Tp(e.remoteStore,r))),n.setAppCheckTokenChangeListener(((r,i)=>Tp(e.remoteStore,i))),n._onlineComponents=e}async function uh(n){if(!n._offlineComponents)if(n._uninitializedComponentsProvider){V(kn,"Using user provided OfflineComponentProvider");try{await ru(n,n._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!(function(i){return i.name==="FirebaseError"?i.code===R.FAILED_PRECONDITION||i.code===R.UNIMPLEMENTED:!(typeof DOMException<"u"&&i instanceof DOMException)||i.code===22||i.code===20||i.code===11})(t))throw t;Ke("Error using user provided cache. Falling back to memory cache: "+t),await ru(n,new li)}}else V(kn,"Using default OfflineComponentProvider"),await ru(n,new ah(void 0));return n._offlineComponents}async function sc(n){return n._onlineComponents||(n._uninitializedComponentsProvider?(V(kn,"Using user provided OnlineComponentProvider"),await Pp(n,n._uninitializedComponentsProvider._online)):(V(kn,"Using default OnlineComponentProvider"),await Pp(n,new Cn))),n._onlineComponents}function My(n){return uh(n).then((e=>e.persistence))}function Ri(n){return uh(n).then((e=>e.localStore))}function Fy(n){return sc(n).then((e=>e.remoteStore))}function lh(n){return sc(n).then((e=>e.syncEngine))}function Uy(n){return sc(n).then((e=>e.datastore))}async function hi(n){const e=await sc(n),t=e.eventManager;return t.onListen=VP.bind(null,e.syncEngine),t.onUnlisten=xP.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=OP.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=LP.bind(null,e.syncEngine),t}function iC(n){return n.asyncQueue.enqueue((async()=>{const e=await My(n),t=await Fy(n);return e.setNetworkEnabled(!0),(function(i){const s=L(i);return s.Ia.delete(0),Zs(s)})(t)}))}function sC(n){return n.asyncQueue.enqueue((async()=>{const e=await My(n),t=await Fy(n);return e.setNetworkEnabled(!1),(async function(i){const s=L(i);s.Ia.add(0),await vi(s),s.Aa.set("Offline")})(t)}))}function oC(n,e){const t=new Oe;return n.asyncQueue.enqueueAndForget((async()=>(async function(i,s,o){try{const c=await(function(l,d){const p=L(l);return p.persistence.runTransaction("read document","readonly",(m=>p.localDocuments.getDocument(m,d)))})(i,s);c.isFoundDocument()?o.resolve(c):c.isNoDocument()?o.resolve(null):o.reject(new N(R.UNAVAILABLE,"Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)"))}catch(c){const u=bi(c,`Failed to get document '${s} from cache`);o.reject(u)}})(await Ri(n),e,t))),t.promise}function By(n,e,t={}){const r=new Oe;return n.asyncQueue.enqueueAndForget((async()=>(function(s,o,c,u,l){const d=new ic({next:m=>{d.Ou(),o.enqueueAndForget((()=>Xl(s,p)));const T=m.docs.has(c);!T&&m.fromCache?l.reject(new N(R.UNAVAILABLE,"Failed to get document because the client is offline.")):T&&m.fromCache&&u&&u.source==="server"?l.reject(new N(R.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):l.resolve(m)},error:m=>l.reject(m)}),p=new eh(Ii(c.path),d,{includeMetadataChanges:!0,ka:!0});return Jl(s,p)})(await hi(n),n.asyncQueue,e,t,r))),r.promise}function aC(n,e){const t=new Oe;return n.asyncQueue.enqueueAndForget((async()=>(async function(i,s,o){try{const c=await _a(i,s,!0),u=new Dy(s,c.qs),l=u.nu(c.documents),d=u.applyChanges(l,!1);o.resolve(d.snapshot)}catch(c){const u=bi(c,`Failed to execute query '${s} against cache`);o.reject(u)}})(await Ri(n),e,t))),t.promise}function qy(n,e,t={}){const r=new Oe;return n.asyncQueue.enqueueAndForget((async()=>(function(s,o,c,u,l){const d=new ic({next:m=>{d.Ou(),o.enqueueAndForget((()=>Xl(s,p))),m.fromCache&&u.source==="server"?l.reject(new N(R.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):l.resolve(m)},error:m=>l.reject(m)}),p=new eh(c,d,{includeMetadataChanges:!0,ka:!0});return Jl(s,p)})(await hi(n),n.asyncQueue,e,t,r))),r.promise}function cC(n,e,t){const r=new Oe;return n.asyncQueue.enqueueAndForget((async()=>{try{const i=await Uy(n);r.resolve((async function(o,c,u){var l;const d=L(o),{request:p,ft:m,parent:T}=j_(d.serializer,m_(c),u);d.connection.Qo||delete p.parent;const P=(await d.Jo("RunAggregationQuery",d.serializer.databaseId,T,p,1)).filter((k=>!!k.result));$(P.length===1,64727);const D=(l=P[0].result)===null||l===void 0?void 0:l.aggregateFields;return Object.keys(D).reduce(((k,U)=>(k[m[U]]=D[U],k)),{})})(i,e,t))}catch(i){r.reject(i)}})),r.promise}function uC(n,e){const t=new ic(e);return n.asyncQueue.enqueueAndForget((async()=>(function(i,s){L(i).Da.add(s),s.next()})(await hi(n),t))),()=>{t.Ou(),n.asyncQueue.enqueueAndForget((async()=>(function(i,s){L(i).Da.delete(s)})(await hi(n),t)))}}function lC(n,e,t,r){const i=(function(o,c){let u;return u=typeof o=="string"?_l().encode(o):o,(function(d,p){return new ZP(d,p)})((function(d,p){if(d instanceof Uint8Array)return Sp(d,p);if(d instanceof ArrayBuffer)return Sp(new Uint8Array(d),p);if(d instanceof ReadableStream)return d.getReader();throw new Error("Source of `toByteStreamReader` has to be a ArrayBuffer or ReadableStream")})(u),c)})(t,vr(e));n.asyncQueue.enqueueAndForget((async()=>{XP(await lh(n),i,r)}))}function hC(n,e){return n.asyncQueue.enqueue((async()=>(function(r,i){const s=L(r);return s.persistence.runTransaction("Get named query","readonly",(o=>s.Ti.getNamedQuery(o,i)))})(await Ri(n),e)))}function jy(n,e){return(function(r,i){return new eC(r,i)})(n,e)}function dC(n,e){return n.asyncQueue.enqueue((async()=>(async function(r,i){const s=L(r),o=s.indexManager,c=[];return s.persistence.runTransaction("Configure indexes","readwrite",(u=>o.getFieldIndexes(u).next((l=>(function(p,m,T,P,D){p=[...p],m=[...m],p.sort(T),m.sort(T);const k=p.length,U=m.length;let B=0,M=0;for(;B<U&&M<k;){const G=T(p[M],m[B]);G<0?D(p[M++]):G>0?P(m[B++]):(B++,M++)}for(;B<U;)P(m[B++]);for(;M<k;)D(p[M++])})(l,i,aR,(d=>{c.push(o.addFieldIndex(u,d))}),(d=>{c.push(o.deleteFieldIndex(u,d))})))).next((()=>A.waitFor(c)))))})(await Ri(n),e)))}function fC(n,e){return n.asyncQueue.enqueue((async()=>(function(r,i){L(r).Cs.Rs=i})(await Ri(n),e)))}function pC(n){return n.asyncQueue.enqueue((async()=>(function(t){const r=L(t),i=r.indexManager;return r.persistence.runTransaction("Delete All Indexes","readwrite",(s=>i.deleteAllFieldIndexes(s)))})(await Ri(n))))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $y(n){const e={};return n.timeoutSeconds!==void 0&&(e.timeoutSeconds=n.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Cp=new Map;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zy="firestore.googleapis.com",kp=!0;class Dp{constructor(e){var t,r;if(e.host===void 0){if(e.ssl!==void 0)throw new N(R.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=zy,this.ssl=kp}else this.host=e.host,this.ssl=(t=e.ssl)!==null&&t!==void 0?t:kp;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=J_;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<ty)throw new N(R.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}Dg("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=$y((r=e.experimentalLongPollingOptions)!==null&&r!==void 0?r:{}),(function(s){if(s.timeoutSeconds!==void 0){if(isNaN(s.timeoutSeconds))throw new N(R.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (must not be NaN)`);if(s.timeoutSeconds<5)throw new N(R.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (minimum allowed value is 5)`);if(s.timeoutSeconds>30)throw new N(R.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (maximum allowed value is 30)`)}})(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&(function(r,i){return r.timeoutSeconds===i.timeoutSeconds})(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class eo{constructor(e,t,r,i){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=r,this._app=i,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new Dp({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new N(R.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new N(R.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new Dp(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=(function(r){if(!r)return new Cg;switch(r.type){case"firstParty":return new tR(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new N(R.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}})(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return(function(t){const r=Cp.get(t);r&&(V("ComponentProvider","Removing Datastore"),Cp.delete(t),r.terminate())})(this),Promise.resolve()}}function Gy(n,e,t,r={}){var i;n=Y(n,eo);const s=Yt(e),o=n._getSettings(),c=Object.assign(Object.assign({},o),{emulatorOptions:n._getEmulatorOptions()}),u=`${e}:${t}`;s&&(ba(`https://${u}`),Wu("Firestore",!0)),o.host!==zy&&o.host!==u&&Ke("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const l=Object.assign(Object.assign({},o),{host:u,ssl:s,emulatorOptions:r});if(!dt(l,c)&&(n._setSettings(l),r.mockUserToken)){let d,p;if(typeof r.mockUserToken=="string")d=r.mockUserToken,p=Ne.MOCK_USER;else{d=om(r.mockUserToken,(i=n._app)===null||i===void 0?void 0:i.options.projectId);const m=r.mockUserToken.sub||r.mockUserToken.user_id;if(!m)throw new N(R.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");p=new Ne(m)}n._authCredentials=new Xb(new Pg(d,p))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ce{constructor(e,t,r){this.converter=t,this._query=r,this.type="query",this.firestore=e}withConverter(e){return new Ce(this.firestore,e,this._query)}}class ie{constructor(e,t,r){this.converter=t,this._key=r,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new It(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new ie(this.firestore,e,this._key)}toJSON(){return{type:ie._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,r){if(Er(t,ie._jsonSchema))return new ie(e,r||null,new x(Q.fromString(t.referencePath)))}}ie._jsonSchemaVersion="firestore/documentReference/1.0",ie._jsonSchema={type:Se("string",ie._jsonSchemaVersion),referencePath:Se("string")};class It extends Ce{constructor(e,t,r){super(e,t,Ii(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new ie(this.firestore,null,new x(e))}withConverter(e){return new It(this.firestore,e,this._path)}}function mC(n,e,...t){if(n=j(n),yl("collection","path",e),n instanceof eo){const r=Q.fromString(e,...t);return If(r),new It(n,null,r)}{if(!(n instanceof ie||n instanceof It))throw new N(R.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=n._path.child(Q.fromString(e,...t));return If(r),new It(n.firestore,null,r)}}function gC(n,e){if(n=Y(n,eo),yl("collectionGroup","collection id",e),e.indexOf("/")>=0)throw new N(R.INVALID_ARGUMENT,`Invalid collection ID '${e}' passed to function collectionGroup(). Collection IDs must not contain '/'.`);return new Ce(n,null,(function(r){return new Zt(Q.emptyPath(),r)})(e))}function Ky(n,e,...t){if(n=j(n),arguments.length===1&&(e=Ua.newId()),yl("doc","path",e),n instanceof eo){const r=Q.fromString(e,...t);return yf(r),new ie(n,null,new x(r))}{if(!(n instanceof ie||n instanceof It))throw new N(R.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=n._path.child(Q.fromString(e,...t));return yf(r),new ie(n.firestore,n instanceof It?n.converter:null,new x(r))}}function _C(n,e){return n=j(n),e=j(e),(n instanceof ie||n instanceof It)&&(e instanceof ie||e instanceof It)&&n.firestore===e.firestore&&n.path===e.path&&n.converter===e.converter}function hh(n,e){return n=j(n),e=j(e),n instanceof Ce&&e instanceof Ce&&n.firestore===e.firestore&&Hs(n._query,e._query)&&n.converter===e.converter}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Np="AsyncQueue";class Vp{constructor(e=Promise.resolve()){this.Zu=[],this.Xu=!1,this.ec=[],this.tc=null,this.nc=!1,this.rc=!1,this.sc=[],this.F_=new Kl(this,"async_queue_retry"),this.oc=()=>{const r=Yo();r&&V(Np,"Visibility state changed to "+r.visibilityState),this.F_.y_()},this._c=e;const t=Yo();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this.oc)}get isShuttingDown(){return this.Xu}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.ac(),this.uc(e)}enterRestrictedMode(e){if(!this.Xu){this.Xu=!0,this.rc=e||!1;const t=Yo();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this.oc)}}enqueue(e){if(this.ac(),this.Xu)return new Promise((()=>{}));const t=new Oe;return this.uc((()=>this.Xu&&this.rc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise))).then((()=>t.promise))}enqueueRetryable(e){this.enqueueAndForget((()=>(this.Zu.push(e),this.cc())))}async cc(){if(this.Zu.length!==0){try{await this.Zu[0](),this.Zu.shift(),this.F_.reset()}catch(e){if(!Vn(e))throw e;V(Np,"Operation failed with retryable error: "+e)}this.Zu.length>0&&this.F_.g_((()=>this.cc()))}}uc(e){const t=this._c.then((()=>(this.nc=!0,e().catch((r=>{throw this.tc=r,this.nc=!1,we("INTERNAL UNHANDLED ERROR: ",Op(r)),r})).then((r=>(this.nc=!1,r))))));return this._c=t,t}enqueueAfterDelay(e,t,r){this.ac(),this.sc.indexOf(e)>-1&&(t=0);const i=Yl.createAndSchedule(this,e,t,r,(s=>this.lc(s)));return this.ec.push(i),i}ac(){this.tc&&q(47125,{hc:Op(this.tc)})}verifyOperationInProgress(){}async Pc(){let e;do e=this._c,await e;while(e!==this._c)}Tc(e){for(const t of this.ec)if(t.timerId===e)return!0;return!1}Ic(e){return this.Pc().then((()=>{this.ec.sort(((t,r)=>t.targetTimeMs-r.targetTimeMs));for(const t of this.ec)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Pc()}))}dc(e){this.sc.push(e)}lc(e){const t=this.ec.indexOf(e);this.ec.splice(t,1)}}function Op(n){let e=n.message||"";return n.stack&&(e=n.stack.includes(n.message)?n.stack:n.message+`
`+n.stack),e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zr(n){return(function(t,r){if(typeof t!="object"||t===null)return!1;const i=t;for(const s of r)if(s in i&&typeof i[s]=="function")return!0;return!1})(n,["next","error","complete"])}class Wy{constructor(){this._progressObserver={},this._taskCompletionResolver=new Oe,this._lastProgress={taskState:"Running",totalBytes:0,totalDocuments:0,bytesLoaded:0,documentsLoaded:0}}onProgress(e,t,r){this._progressObserver={next:e,error:t,complete:r}}catch(e){return this._taskCompletionResolver.promise.catch(e)}then(e,t){return this._taskCompletionResolver.promise.then(e,t)}_completeWith(e){this._updateProgress(e),this._progressObserver.complete&&this._progressObserver.complete(),this._taskCompletionResolver.resolve(e)}_failWith(e){this._lastProgress.taskState="Error",this._progressObserver.next&&this._progressObserver.next(this._lastProgress),this._progressObserver.error&&this._progressObserver.error(e),this._taskCompletionResolver.reject(e)}_updateProgress(e){this._lastProgress=e,this._progressObserver.next&&this._progressObserver.next(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yC=-1;class oe extends eo{constructor(e,t,r,i){super(e,t,r,i),this.type="firestore",this._queue=new Vp,this._persistenceKey=(i==null?void 0:i.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new Vp(e),this._firestoreClient=void 0,await e}}}function IC(n,e,t){t||(t=Vs);const r=Nt(n,"firestore");if(r.isInitialized(t)){const i=r.getImmediate({identifier:t}),s=r.getOptions(t);if(dt(s,e))return i;throw new N(R.FAILED_PRECONDITION,"initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.")}if(e.cacheSizeBytes!==void 0&&e.localCache!==void 0)throw new N(R.INVALID_ARGUMENT,"cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes willbe deprecated. Instead, specify the cache size in the cache object");if(e.cacheSizeBytes!==void 0&&e.cacheSizeBytes!==-1&&e.cacheSizeBytes<ty)throw new N(R.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");return e.host&&Yt(e.host)&&ba(e.host),r.initialize({options:e,instanceIdentifier:t})}function TC(n,e){const t=typeof n=="object"?n:Pa(),r=typeof n=="string"?n:e||Vs,i=Nt(t,"firestore").getImmediate({identifier:r});if(!i._initialized){const s=rm("firestore");s&&Gy(i,...s)}return i}function _e(n){if(n._terminated)throw new N(R.FAILED_PRECONDITION,"The client has already been terminated.");return n._firestoreClient||Hy(n),n._firestoreClient}function Hy(n){var e,t,r;const i=n._freezeSettings(),s=(function(c,u,l,d){return new qR(c,u,l,d.host,d.ssl,d.experimentalForceLongPolling,d.experimentalAutoDetectLongPolling,$y(d.experimentalLongPollingOptions),d.useFetchStreams,d.isUsingEmulator)})(n._databaseId,((e=n._app)===null||e===void 0?void 0:e.options.appId)||"",n._persistenceKey,i);n._componentsProvider||!((t=i.localCache)===null||t===void 0)&&t._offlineComponentProvider&&(!((r=i.localCache)===null||r===void 0)&&r._onlineComponentProvider)&&(n._componentsProvider={_offline:i.localCache._offlineComponentProvider,_online:i.localCache._onlineComponentProvider}),n._firestoreClient=new rC(n._authCredentials,n._appCheckCredentials,n._queue,s,n._componentsProvider&&(function(c){const u=c==null?void 0:c._online.build();return{_offline:c==null?void 0:c._offline.build(u),_online:u}})(n._componentsProvider))}function EC(n,e){Ke("enableIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const t=n._freezeSettings();return Qy(n,Cn.provider,{build:r=>new ch(r,t.cacheSizeBytes,e==null?void 0:e.forceOwnership)}),Promise.resolve()}async function vC(n){Ke("enableMultiTabIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const e=n._freezeSettings();Qy(n,Cn.provider,{build:t=>new Ly(t,e.cacheSizeBytes)})}function Qy(n,e,t){if((n=Y(n,oe))._firestoreClient||n._terminated)throw new N(R.FAILED_PRECONDITION,"Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other methods on a Firestore object.");if(n._componentsProvider||n._getSettings().localCache)throw new N(R.FAILED_PRECONDITION,"SDK cache is already specified.");n._componentsProvider={_online:e,_offline:t},Hy(n)}function wC(n){if(n._initialized&&!n._terminated)throw new N(R.FAILED_PRECONDITION,"Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");const e=new Oe;return n._queue.enqueueAndForgetEvenWhileRestricted((async()=>{try{await(async function(r){if(!Pt.C())return Promise.resolve();const i=r+ay;await Pt.delete(i)})(jl(n._databaseId,n._persistenceKey)),e.resolve()}catch(t){e.reject(t)}})),e.promise}function AC(n){return(function(t){const r=new Oe;return t.asyncQueue.enqueueAndForget((async()=>qP(await lh(t),r))),r.promise})(_e(n=Y(n,oe)))}function bC(n){return iC(_e(n=Y(n,oe)))}function RC(n){return sC(_e(n=Y(n,oe)))}function SC(n){return rv(n.app,"firestore",n._databaseId.database),n._delete()}function $u(n,e){const t=_e(n=Y(n,oe)),r=new Wy;return lC(t,n._databaseId,e,r),r}function Yy(n,e){return hC(_e(n=Y(n,oe)),e).then((t=>t?new Ce(n,null,t.query):null))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class di{constructor(e="count",t){this._internalFieldPath=t,this.type="AggregateField",this.aggregateType=e}}class Jy{constructor(e,t,r){this._userDataWriter=t,this._data=r,this.type="AggregateQuerySnapshot",this.query=e}data(){return this._userDataWriter.convertObjectMap(this._data)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Je{constructor(e){this._byteString=e}static fromBase64String(e){try{return new Je(ye.fromBase64String(e))}catch(t){throw new N(R.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new Je(ye.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:Je._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(Er(e,Je._jsonSchema))return Je.fromBase64String(e.bytes)}}Je._jsonSchemaVersion="firestore/bytes/1.0",Je._jsonSchema={type:Se("string",Je._jsonSchemaVersion),bytes:Se("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mn{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new N(R.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new he(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}function PC(){return new Mn(Iu)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fn{constructor(e){this._methodName=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tt{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new N(R.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new N(R.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return K(this._lat,e._lat)||K(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:Tt._jsonSchemaVersion}}static fromJSON(e){if(Er(e,Tt._jsonSchema))return new Tt(e.latitude,e.longitude)}}Tt._jsonSchemaVersion="firestore/geoPoint/1.0",Tt._jsonSchema={type:Se("string",Tt._jsonSchemaVersion),latitude:Se("number"),longitude:Se("number")};/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ht{constructor(e){this._values=(e||[]).map((t=>t))}toArray(){return this._values.map((e=>e))}isEqual(e){return(function(r,i){if(r.length!==i.length)return!1;for(let s=0;s<r.length;++s)if(r[s]!==i[s])return!1;return!0})(this._values,e._values)}toJSON(){return{type:ht._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(Er(e,ht._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every((t=>typeof t=="number")))return new ht(e.vectorValues);throw new N(R.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}ht._jsonSchemaVersion="firestore/vectorValue/1.0",ht._jsonSchema={type:Se("string",ht._jsonSchemaVersion),vectorValues:Se("object")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const CC=/^__.*__$/;class kC{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r}toMutation(e,t){return this.fieldMask!==null?new tn(e,this.data,this.fieldMask,t,this.fieldTransforms):new Ti(e,this.data,t,this.fieldTransforms)}}class Xy{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r}toMutation(e,t){return new tn(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function Zy(n){switch(n){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw q(40011,{Ec:n})}}class oc{constructor(e,t,r,i,s,o){this.settings=e,this.databaseId=t,this.serializer=r,this.ignoreUndefinedProperties=i,s===void 0&&this.Ac(),this.fieldTransforms=s||[],this.fieldMask=o||[]}get path(){return this.settings.path}get Ec(){return this.settings.Ec}Rc(e){return new oc(Object.assign(Object.assign({},this.settings),e),this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}Vc(e){var t;const r=(t=this.path)===null||t===void 0?void 0:t.child(e),i=this.Rc({path:r,mc:!1});return i.fc(e),i}gc(e){var t;const r=(t=this.path)===null||t===void 0?void 0:t.child(e),i=this.Rc({path:r,mc:!1});return i.Ac(),i}yc(e){return this.Rc({path:void 0,mc:!0})}wc(e){return Ea(e,this.settings.methodName,this.settings.Sc||!1,this.path,this.settings.bc)}contains(e){return this.fieldMask.find((t=>e.isPrefixOf(t)))!==void 0||this.fieldTransforms.find((t=>e.isPrefixOf(t.field)))!==void 0}Ac(){if(this.path)for(let e=0;e<this.path.length;e++)this.fc(this.path.get(e))}fc(e){if(e.length===0)throw this.wc("Document fields must not be empty");if(Zy(this.Ec)&&CC.test(e))throw this.wc('Document fields cannot begin and end with "__"')}}class DC{constructor(e,t,r){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=r||vr(e)}Dc(e,t,r,i=!1){return new oc({Ec:e,methodName:t,bc:r,path:he.emptyPath(),mc:!1,Sc:i},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function wr(n){const e=n._freezeSettings(),t=vr(n._databaseId);return new DC(n._databaseId,!!e.ignoreUndefinedProperties,t)}function ac(n,e,t,r,i,s={}){const o=n.Dc(s.merge||s.mergeFields?2:0,e,t,i);yh("Data must be an object, but it was:",o,r);const c=nI(r,o);let u,l;if(s.merge)u=new Ze(o.fieldMask),l=o.fieldTransforms;else if(s.mergeFields){const d=[];for(const p of s.mergeFields){const m=Us(e,p,t);if(!o.contains(m))throw new N(R.INVALID_ARGUMENT,`Field '${m}' is specified in your field mask but missing from your input data.`);iI(d,m)||d.push(m)}u=new Ze(d),l=o.fieldTransforms.filter((p=>u.covers(p.field)))}else u=null,l=o.fieldTransforms;return new kC(new Me(c),u,l)}class to extends Fn{_toFieldTransform(e){if(e.Ec!==2)throw e.Ec===1?e.wc(`${this._methodName}() can only appear at the top level of your update data`):e.wc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof to}}function eI(n,e,t){return new oc({Ec:3,bc:e.settings.bc,methodName:n._methodName,mc:t},e.databaseId,e.serializer,e.ignoreUndefinedProperties)}class dh extends Fn{_toFieldTransform(e){return new Ys(e.path,new ri)}isEqual(e){return e instanceof dh}}class fh extends Fn{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=eI(this,e,!0),r=this.vc.map((s=>Ar(s,t))),i=new cr(r);return new Ys(e.path,i)}isEqual(e){return e instanceof fh&&dt(this.vc,e.vc)}}class ph extends Fn{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=eI(this,e,!0),r=this.vc.map((s=>Ar(s,t))),i=new ur(r);return new Ys(e.path,i)}isEqual(e){return e instanceof ph&&dt(this.vc,e.vc)}}class mh extends Fn{constructor(e,t){super(e),this.Cc=t}_toFieldTransform(e){const t=new ii(e.serializer,A_(e.serializer,this.Cc));return new Ys(e.path,t)}isEqual(e){return e instanceof mh&&this.Cc===e.Cc}}function gh(n,e,t,r){const i=n.Dc(1,e,t);yh("Data must be an object, but it was:",i,r);const s=[],o=Me.empty();On(r,((u,l)=>{const d=cc(e,u,t);l=j(l);const p=i.gc(d);if(l instanceof to)s.push(d);else{const m=Ar(l,p);m!=null&&(s.push(d),o.set(d,m))}}));const c=new Ze(s);return new Xy(o,c,i.fieldTransforms)}function _h(n,e,t,r,i,s){const o=n.Dc(1,e,t),c=[Us(e,r,t)],u=[i];if(s.length%2!=0)throw new N(R.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let m=0;m<s.length;m+=2)c.push(Us(e,s[m])),u.push(s[m+1]);const l=[],d=Me.empty();for(let m=c.length-1;m>=0;--m)if(!iI(l,c[m])){const T=c[m];let P=u[m];P=j(P);const D=o.gc(T);if(P instanceof to)l.push(T);else{const k=Ar(P,D);k!=null&&(l.push(T),d.set(T,k))}}const p=new Ze(l);return new Xy(d,p,o.fieldTransforms)}function tI(n,e,t,r=!1){return Ar(t,n.Dc(r?4:3,e))}function Ar(n,e){if(rI(n=j(n)))return yh("Unsupported field value:",e,n),nI(n,e);if(n instanceof Fn)return(function(r,i){if(!Zy(i.Ec))throw i.wc(`${r._methodName}() can only be used with update() and set()`);if(!i.path)throw i.wc(`${r._methodName}() is not currently supported inside arrays`);const s=r._toFieldTransform(i);s&&i.fieldTransforms.push(s)})(n,e),null;if(n===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),n instanceof Array){if(e.settings.mc&&e.Ec!==4)throw e.wc("Nested arrays are not supported");return(function(r,i){const s=[];let o=0;for(const c of r){let u=Ar(c,i.yc(o));u==null&&(u={nullValue:"NULL_VALUE"}),s.push(u),o++}return{arrayValue:{values:s}}})(n,e)}return(function(r,i){if((r=j(r))===null)return{nullValue:"NULL_VALUE"};if(typeof r=="number")return A_(i.serializer,r);if(typeof r=="boolean")return{booleanValue:r};if(typeof r=="string")return{stringValue:r};if(r instanceof Date){const s=ne.fromDate(r);return{timestampValue:si(i.serializer,s)}}if(r instanceof ne){const s=new ne(r.seconds,1e3*Math.floor(r.nanoseconds/1e3));return{timestampValue:si(i.serializer,s)}}if(r instanceof Tt)return{geoPointValue:{latitude:r.latitude,longitude:r.longitude}};if(r instanceof Je)return{bytesValue:L_(i.serializer,r._byteString)};if(r instanceof ie){const s=i.databaseId,o=r.firestore._databaseId;if(!o.isEqual(s))throw i.wc(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${s.projectId}/${s.database}`);return{referenceValue:Ll(r.firestore._databaseId||i.databaseId,r._key.path)}}if(r instanceof ht)return(function(o,c){return{mapValue:{fields:{[bl]:{stringValue:Rl},[ei]:{arrayValue:{values:o.toArray().map((l=>{if(typeof l!="number")throw c.wc("VectorValues must only contain numeric values.");return kl(c.serializer,l)}))}}}}}})(r,i);throw i.wc(`Unsupported field value: ${Ba(r)}`)})(n,e)}function nI(n,e){const t={};return Jg(n)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):On(n,((r,i)=>{const s=Ar(i,e.Vc(r));s!=null&&(t[r]=s)})),{mapValue:{fields:t}}}function rI(n){return!(typeof n!="object"||n===null||n instanceof Array||n instanceof Date||n instanceof ne||n instanceof Tt||n instanceof Je||n instanceof ie||n instanceof Fn||n instanceof ht)}function yh(n,e,t){if(!rI(t)||!Ng(t)){const r=Ba(t);throw r==="an object"?e.wc(n+" a custom object"):e.wc(n+" "+r)}}function Us(n,e,t){if((e=j(e))instanceof Mn)return e._internalPath;if(typeof e=="string")return cc(n,e);throw Ea("Field path arguments must be of type string or ",n,!1,void 0,t)}const NC=new RegExp("[~\\*/\\[\\]]");function cc(n,e,t){if(e.search(NC)>=0)throw Ea(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,n,!1,void 0,t);try{return new Mn(...e.split("."))._internalPath}catch{throw Ea(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,n,!1,void 0,t)}}function Ea(n,e,t,r,i){const s=r&&!r.isEmpty(),o=i!==void 0;let c=`Function ${e}() called with invalid data`;t&&(c+=" (via `toFirestore()`)"),c+=". ";let u="";return(s||o)&&(u+=" (found",s&&(u+=` in field ${r}`),o&&(u+=` in document ${i}`),u+=")"),new N(R.INVALID_ARGUMENT,c+n+u)}function iI(n,e){return n.some((t=>t.isEqual(e)))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bs{constructor(e,t,r,i,s){this._firestore=e,this._userDataWriter=t,this._key=r,this._document=i,this._converter=s}get id(){return this._key.path.lastSegment()}get ref(){return new ie(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new VC(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const t=this._document.data.field(uc("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class VC extends Bs{data(){return super.data()}}function uc(n,e){return typeof e=="string"?cc(n,e):e instanceof Mn?e._internalPath:e._delegate._internalPath}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sI(n){if(n.limitType==="L"&&n.explicitOrderBy.length===0)throw new N(R.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class Ih{}class Si extends Ih{}function OC(n,e,...t){let r=[];e instanceof Ih&&r.push(e),r=r.concat(t),(function(s){const o=s.filter((u=>u instanceof br)).length,c=s.filter((u=>u instanceof Pi)).length;if(o>1||o>0&&c>0)throw new N(R.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")})(r);for(const i of r)n=i._apply(n);return n}class Pi extends Si{constructor(e,t,r){super(),this._field=e,this._op=t,this._value=r,this.type="where"}static _create(e,t,r){return new Pi(e,t,r)}_apply(e){const t=this._parse(e);return aI(e._query,t),new Ce(e.firestore,e.converter,ku(e._query,t))}_parse(e){const t=wr(e.firestore);return(function(s,o,c,u,l,d,p){let m;if(l.isKeyField()){if(d==="array-contains"||d==="array-contains-any")throw new N(R.INVALID_ARGUMENT,`Invalid Query. You can't perform '${d}' queries on documentId().`);if(d==="in"||d==="not-in"){Lp(p,d);const P=[];for(const D of p)P.push(xp(u,s,D));m={arrayValue:{values:P}}}else m=xp(u,s,p)}else d!=="in"&&d!=="not-in"&&d!=="array-contains-any"||Lp(p,d),m=tI(c,o,p,d==="in"||d==="not-in");return Z.create(l,d,m)})(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function xC(n,e,t){const r=e,i=uc("where",n);return Pi._create(i,r,t)}class br extends Ih{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new br(e,t)}_parse(e){const t=this._queryConstraints.map((r=>r._parse(e))).filter((r=>r.getFilters().length>0));return t.length===1?t[0]:re.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:((function(i,s){let o=i;const c=s.getFlattenedFilters();for(const u of c)aI(o,u),o=ku(o,u)})(e._query,t),new Ce(e.firestore,e.converter,ku(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}function LC(...n){return n.forEach((e=>cI("or",e))),br._create("or",n)}function MC(...n){return n.forEach((e=>cI("and",e))),br._create("and",n)}class lc extends Si{constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}static _create(e,t){return new lc(e,t)}_apply(e){const t=(function(i,s,o){if(i.startAt!==null)throw new N(R.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(i.endAt!==null)throw new N(R.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new Ls(s,o)})(e._query,this._field,this._direction);return new Ce(e.firestore,e.converter,(function(i,s){const o=i.explicitOrderBy.concat([s]);return new Zt(i.path,i.collectionGroup,o,i.filters.slice(),i.limit,i.limitType,i.startAt,i.endAt)})(e._query,t))}}function FC(n,e="asc"){const t=e,r=uc("orderBy",n);return lc._create(r,t)}class no extends Si{constructor(e,t,r){super(),this.type=e,this._limit=t,this._limitType=r}static _create(e,t,r){return new no(e,t,r)}_apply(e){return new Ce(e.firestore,e.converter,ha(e._query,this._limit,this._limitType))}}function UC(n){return Vg("limit",n),no._create("limit",n,"F")}function BC(n){return Vg("limitToLast",n),no._create("limitToLast",n,"L")}class ro extends Si{constructor(e,t,r){super(),this.type=e,this._docOrFields=t,this._inclusive=r}static _create(e,t,r){return new ro(e,t,r)}_apply(e){const t=oI(e,this.type,this._docOrFields,this._inclusive);return new Ce(e.firestore,e.converter,(function(i,s){return new Zt(i.path,i.collectionGroup,i.explicitOrderBy.slice(),i.filters.slice(),i.limit,i.limitType,s,i.endAt)})(e._query,t))}}function qC(...n){return ro._create("startAt",n,!0)}function jC(...n){return ro._create("startAfter",n,!1)}class io extends Si{constructor(e,t,r){super(),this.type=e,this._docOrFields=t,this._inclusive=r}static _create(e,t,r){return new io(e,t,r)}_apply(e){const t=oI(e,this.type,this._docOrFields,this._inclusive);return new Ce(e.firestore,e.converter,(function(i,s){return new Zt(i.path,i.collectionGroup,i.explicitOrderBy.slice(),i.filters.slice(),i.limit,i.limitType,i.startAt,s)})(e._query,t))}}function $C(...n){return io._create("endBefore",n,!1)}function zC(...n){return io._create("endAt",n,!0)}function oI(n,e,t,r){if(t[0]=j(t[0]),t[0]instanceof Bs)return(function(s,o,c,u,l){if(!u)throw new N(R.NOT_FOUND,`Can't use a DocumentSnapshot that doesn't exist for ${c}().`);const d=[];for(const p of $r(s))if(p.field.isKeyField())d.push(or(o,u.key));else{const m=u.data.field(p.field);if(Ga(m))throw new N(R.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+p.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(m===null){const T=p.field.canonicalString();throw new N(R.INVALID_ARGUMENT,`Invalid query. You are trying to start or end a query using a document for which the field '${T}' (used as the orderBy) does not exist.`)}d.push(m)}return new Sn(d,l)})(n._query,n.firestore._databaseId,e,t[0]._document,r);{const i=wr(n.firestore);return(function(o,c,u,l,d,p){const m=o.explicitOrderBy;if(d.length>m.length)throw new N(R.INVALID_ARGUMENT,`Too many arguments provided to ${l}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);const T=[];for(let P=0;P<d.length;P++){const D=d[P];if(m[P].field.isKeyField()){if(typeof D!="string")throw new N(R.INVALID_ARGUMENT,`Invalid query. Expected a string for document ID in ${l}(), but got a ${typeof D}`);if(!Pl(o)&&D.indexOf("/")!==-1)throw new N(R.INVALID_ARGUMENT,`Invalid query. When querying a collection and ordering by documentId(), the value passed to ${l}() must be a plain document ID, but '${D}' contains a slash.`);const k=o.path.child(Q.fromString(D));if(!x.isDocumentKey(k))throw new N(R.INVALID_ARGUMENT,`Invalid query. When querying a collection group and ordering by documentId(), the value passed to ${l}() must result in a valid document path, but '${k}' is not because it contains an odd number of segments.`);const U=new x(k);T.push(or(c,U))}else{const k=tI(u,l,D);T.push(k)}}return new Sn(T,p)})(n._query,n.firestore._databaseId,i,e,t,r)}}function xp(n,e,t){if(typeof(t=j(t))=="string"){if(t==="")throw new N(R.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!Pl(e)&&t.indexOf("/")!==-1)throw new N(R.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const r=e.path.child(Q.fromString(t));if(!x.isDocumentKey(r))throw new N(R.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${r}' is not because it has an odd number of segments (${r.length}).`);return or(n,new x(r))}if(t instanceof ie)return or(n,t._key);throw new N(R.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${Ba(t)}.`)}function Lp(n,e){if(!Array.isArray(n)||n.length===0)throw new N(R.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function aI(n,e){const t=(function(i,s){for(const o of i)for(const c of o.getFlattenedFilters())if(s.indexOf(c.op)>=0)return c.op;return null})(n.filters,(function(i){switch(i){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}})(e.op));if(t!==null)throw t===e.op?new N(R.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new N(R.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}function cI(n,e){if(!(e instanceof Pi||e instanceof br))throw new N(R.INVALID_ARGUMENT,`Function ${n}() requires AppliableConstraints created with a call to 'where(...)', 'or(...)', or 'and(...)'.`)}class Th{convertValue(e,t="none"){switch(bn(e)){case 0:return null;case 1:return e.booleanValue;case 2:return pe(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(Qt(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw q(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const r={};return On(e,((i,s)=>{r[i]=this.convertValue(s,t)})),r}convertVectorValue(e){var t,r,i;const s=(i=(r=(t=e.fields)===null||t===void 0?void 0:t[ei].arrayValue)===null||r===void 0?void 0:r.values)===null||i===void 0?void 0:i.map((o=>pe(o.doubleValue)));return new ht(s)}convertGeoPoint(e){return new Tt(pe(e.latitude),pe(e.longitude))}convertArray(e,t){return(e.values||[]).map((r=>this.convertValue(r,t)))}convertServerTimestamp(e,t){switch(t){case"previous":const r=Ka(e);return r==null?null:this.convertValue(r,t);case"estimate":return this.convertTimestamp(Ns(e));default:return null}}convertTimestamp(e){const t=Ht(e);return new ne(t.seconds,t.nanos)}convertDocumentKey(e,t){const r=Q.fromString(e);$(K_(r),9688,{name:e});const i=new An(r.get(1),r.get(3)),s=new x(r.popFirst(5));return i.isEqual(t)||we(`Document ${s} contains a document reference within a different database (${i.projectId}/${i.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hc(n,e,t){let r;return r=n?t&&(t.merge||t.mergeFields)?n.toFirestore(e,t):n.toFirestore(e):e,r}class Eh extends Th{constructor(e){super(),this.firestore=e}convertBytes(e){return new Je(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new ie(this.firestore,null,t)}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function GC(n){return new di("sum",Us("sum",n))}function KC(n){return new di("avg",Us("average",n))}function uI(){return new di("count")}function WC(n,e){var t,r;return n instanceof di&&e instanceof di&&n.aggregateType===e.aggregateType&&((t=n._internalFieldPath)===null||t===void 0?void 0:t.canonicalString())===((r=e._internalFieldPath)===null||r===void 0?void 0:r.canonicalString())}function HC(n,e){return hh(n.query,e.query)&&dt(n.data(),e.data())}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lI="NOT SUPPORTED";class $t{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class nt extends Bs{constructor(e,t,r,i,s,o){super(e,t,r,i,o),this._firestore=e,this._firestoreImpl=e,this.metadata=s}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new Ts(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const r=this._document.data.field(uc("DocumentSnapshot.get",e));if(r!==null)return this._userDataWriter.convertValue(r,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new N(R.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=nt._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}}function QC(n,e,t){if(Er(e,nt._jsonSchema)){if(e.bundle===lI)throw new N(R.INVALID_ARGUMENT,"The provided JSON object was created in a client environment, which is not supported.");const r=vr(n._databaseId),i=jy(e.bundle,r),s=i.Ku(),o=new th(i.getMetadata(),r);for(const d of s)o.Wa(d);const c=o.documents;if(c.length!==1)throw new N(R.INVALID_ARGUMENT,`Expected bundle data to contain 1 document, but it contains ${c.length} documents.`);const u=Ya(r,c[0].document),l=new x(Q.fromString(e.bundleName));return new nt(n,new Eh(n),l,u,new $t(!1,!1),t||null)}}nt._jsonSchemaVersion="firestore/documentSnapshot/1.0",nt._jsonSchema={type:Se("string",nt._jsonSchemaVersion),bundleSource:Se("string","DocumentSnapshot"),bundleName:Se("string"),bundle:Se("string")};class Ts extends nt{data(e={}){return super.data(e)}}class rt{constructor(e,t,r,i){this._firestore=e,this._userDataWriter=t,this._snapshot=i,this.metadata=new $t(i.hasPendingWrites,i.fromCache),this.query=r}get docs(){const e=[];return this.forEach((t=>e.push(t))),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach((r=>{e.call(t,new Ts(this._firestore,this._userDataWriter,r.key,r,new $t(this._snapshot.mutatedKeys.has(r.key),this._snapshot.fromCache),this.query.converter))}))}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new N(R.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=(function(i,s){if(i._snapshot.oldDocs.isEmpty()){let o=0;return i._snapshot.docChanges.map((c=>{const u=new Ts(i._firestore,i._userDataWriter,c.doc.key,c.doc,new $t(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);return c.doc,{type:"added",doc:u,oldIndex:-1,newIndex:o++}}))}{let o=i._snapshot.oldDocs;return i._snapshot.docChanges.filter((c=>s||c.type!==3)).map((c=>{const u=new Ts(i._firestore,i._userDataWriter,c.doc.key,c.doc,new $t(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);let l=-1,d=-1;return c.type!==0&&(l=o.indexOf(c.doc.key),o=o.delete(c.doc.key)),c.type!==1&&(o=o.add(c.doc),d=o.indexOf(c.doc.key)),{type:JC(c.type),doc:u,oldIndex:l,newIndex:d}}))}})(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new N(R.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=rt._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=Ua.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],r=[],i=[];return this.docs.forEach((s=>{s._document!==null&&(t.push(s._document),r.push(this._userDataWriter.convertObjectMap(s._document.data.value.mapValue.fields,"previous")),i.push(s.ref.path))})),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function YC(n,e,t){if(Er(e,rt._jsonSchema)){if(e.bundle===lI)throw new N(R.INVALID_ARGUMENT,"The provided JSON object was created in a client environment, which is not supported.");const r=vr(n._databaseId),i=jy(e.bundle,r),s=i.Ku(),o=new th(i.getMetadata(),r);for(const m of s)o.Wa(m);if(o.queries.length!==1)throw new N(R.INVALID_ARGUMENT,`Snapshot data expected 1 query but found ${o.queries.length} queries.`);const c=Xa(o.queries[0].bundledQuery),u=o.documents;let l=new ir;u.map((m=>{const T=Ya(r,m.document);l=l.add(T)}));const d=pr.fromInitialDocuments(c,l,H(),!1,!1),p=new Ce(n,t||null,c);return new rt(n,new Eh(n),p,d)}}function JC(n){switch(n){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return q(61501,{type:n})}}function XC(n,e){return n instanceof nt&&e instanceof nt?n._firestore===e._firestore&&n._key.isEqual(e._key)&&(n._document===null?e._document===null:n._document.isEqual(e._document))&&n._converter===e._converter:n instanceof rt&&e instanceof rt&&n._firestore===e._firestore&&hh(n.query,e.query)&&n.metadata.isEqual(e.metadata)&&n._snapshot.isEqual(e._snapshot)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ZC(n){n=Y(n,ie);const e=Y(n.firestore,oe);return By(_e(e),n._key).then((t=>vh(e,n,t)))}rt._jsonSchemaVersion="firestore/querySnapshot/1.0",rt._jsonSchema={type:Se("string",rt._jsonSchemaVersion),bundleSource:Se("string","QuerySnapshot"),bundleName:Se("string"),bundle:Se("string")};class Un extends Th{constructor(e){super(),this.firestore=e}convertBytes(e){return new Je(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new ie(this.firestore,null,t)}}function e0(n){n=Y(n,ie);const e=Y(n.firestore,oe),t=_e(e),r=new Un(e);return oC(t,n._key).then((i=>new nt(e,r,n._key,i,new $t(i!==null&&i.hasLocalMutations,!0),n.converter)))}function t0(n){n=Y(n,ie);const e=Y(n.firestore,oe);return By(_e(e),n._key,{source:"server"}).then((t=>vh(e,n,t)))}function n0(n){n=Y(n,Ce);const e=Y(n.firestore,oe),t=_e(e),r=new Un(e);return sI(n._query),qy(t,n._query).then((i=>new rt(e,r,n,i)))}function r0(n){n=Y(n,Ce);const e=Y(n.firestore,oe),t=_e(e),r=new Un(e);return aC(t,n._query).then((i=>new rt(e,r,n,i)))}function i0(n){n=Y(n,Ce);const e=Y(n.firestore,oe),t=_e(e),r=new Un(e);return qy(t,n._query,{source:"server"}).then((i=>new rt(e,r,n,i)))}function s0(n,e,t){n=Y(n,ie);const r=Y(n.firestore,oe),i=hc(n.converter,e,t);return Ci(r,[ac(wr(r),"setDoc",n._key,i,n.converter!==null,t).toMutation(n._key,ge.none())])}function o0(n,e,t,...r){n=Y(n,ie);const i=Y(n.firestore,oe),s=wr(i);let o;return o=typeof(e=j(e))=="string"||e instanceof Mn?_h(s,"updateDoc",n._key,e,t,r):gh(s,"updateDoc",n._key,e),Ci(i,[o.toMutation(n._key,ge.exists(!0))])}function a0(n){return Ci(Y(n.firestore,oe),[new Ei(n._key,ge.none())])}function c0(n,e){const t=Y(n.firestore,oe),r=Ky(n),i=hc(n.converter,e);return Ci(t,[ac(wr(n.firestore),"addDoc",r._key,i,n.converter!==null,{}).toMutation(r._key,ge.exists(!1))]).then((()=>r))}function zu(n,...e){var t,r,i;n=j(n);let s={includeMetadataChanges:!1,source:"default"},o=0;typeof e[o]!="object"||zr(e[o])||(s=e[o++]);const c={includeMetadataChanges:s.includeMetadataChanges,source:s.source};if(zr(e[o])){const p=e[o];e[o]=(t=p.next)===null||t===void 0?void 0:t.bind(p),e[o+1]=(r=p.error)===null||r===void 0?void 0:r.bind(p),e[o+2]=(i=p.complete)===null||i===void 0?void 0:i.bind(p)}let u,l,d;if(n instanceof ie)l=Y(n.firestore,oe),d=Ii(n._key.path),u={next:p=>{e[o]&&e[o](vh(l,n,p))},error:e[o+1],complete:e[o+2]};else{const p=Y(n,Ce);l=Y(p.firestore,oe),d=p._query;const m=new Un(l);u={next:T=>{e[o]&&e[o](new rt(l,m,p,T))},error:e[o+1],complete:e[o+2]},sI(n._query)}return(function(m,T,P,D){const k=new ic(D),U=new eh(T,k,P);return m.asyncQueue.enqueueAndForget((async()=>Jl(await hi(m),U))),()=>{k.Ou(),m.asyncQueue.enqueueAndForget((async()=>Xl(await hi(m),U)))}})(_e(l),d,c,u)}function u0(n,e,...t){const r=j(n),i=(function(u){const l={bundle:"",bundleName:"",bundleSource:""},d=["bundle","bundleName","bundleSource"];for(const p of d){if(!(p in u)){l.error=`snapshotJson missing required field: ${p}`;break}const m=u[p];if(typeof m!="string"){l.error=`snapshotJson field '${p}' must be a string.`;break}if(m.length===0){l.error=`snapshotJson field '${p}' cannot be an empty string.`;break}p==="bundle"?l.bundle=m:p==="bundleName"?l.bundleName=m:p==="bundleSource"&&(l.bundleSource=m)}return l})(e);if(i.error)throw new N(R.INVALID_ARGUMENT,i.error);let s,o=0;if(typeof t[o]!="object"||zr(t[o])||(s=t[o++]),i.bundleSource==="QuerySnapshot"){let c=null;if(typeof t[o]=="object"&&zr(t[o])){const u=t[o++];c={next:u.next,error:u.error,complete:u.complete}}else c={next:t[o++],error:t[o++],complete:t[o++]};return(function(l,d,p,m,T){let P,D=!1;return $u(l,d.bundle).then((()=>Yy(l,d.bundleName))).then((U=>{U&&!D&&(T&&U.withConverter(T),P=zu(U,p||{},m))})).catch((U=>(m.error&&m.error(U),()=>{}))),()=>{D||(D=!0,P&&P())}})(r,i,s,c,t[o])}if(i.bundleSource==="DocumentSnapshot"){let c=null;if(typeof t[o]=="object"&&zr(t[o])){const u=t[o++];c={next:u.next,error:u.error,complete:u.complete}}else c={next:t[o++],error:t[o++],complete:t[o++]};return(function(l,d,p,m,T){let P,D=!1;return $u(l,d.bundle).then((()=>{if(!D){const U=new ie(l,T||null,x.fromPath(d.bundleName));P=zu(U,p||{},m)}})).catch((U=>(m.error&&m.error(U),()=>{}))),()=>{D||(D=!0,P&&P())}})(r,i,s,c,t[o])}throw new N(R.INVALID_ARGUMENT,`unsupported bundle source: ${i.bundleSource}`)}function l0(n,e){return uC(_e(n=Y(n,oe)),zr(e)?e:{next:e})}function Ci(n,e){return(function(r,i){const s=new Oe;return r.asyncQueue.enqueueAndForget((async()=>MP(await lh(r),i,s))),s.promise})(_e(n),e)}function vh(n,e,t){const r=t.docs.get(e._key),i=new Un(n);return new nt(n,i,e._key,r,new $t(t.hasPendingWrites,t.fromCache),e.converter)}function h0(n){return hI(n,{count:uI()})}function hI(n,e){const t=Y(n.firestore,oe),r=_e(t),i=Yg(e,((s,o)=>new D_(o,s.aggregateType,s._internalFieldPath)));return cC(r,n._query,i).then((s=>(function(c,u,l){const d=new Un(c);return new Jy(u,d,l)})(t,n,s)))}class d0{constructor(e){this.kind="memory",this._onlineComponentProvider=Cn.provider,e!=null&&e.garbageCollector?this._offlineComponentProvider=e.garbageCollector._offlineComponentProvider:this._offlineComponentProvider={build:()=>new ah(void 0)}}toJSON(){return{kind:this.kind}}}class f0{constructor(e){let t;this.kind="persistent",e!=null&&e.tabManager?(e.tabManager._initialize(e),t=e.tabManager):(t=dI(void 0),t._initialize(e)),this._onlineComponentProvider=t._onlineComponentProvider,this._offlineComponentProvider=t._offlineComponentProvider}toJSON(){return{kind:this.kind}}}class p0{constructor(){this.kind="memoryEager",this._offlineComponentProvider=li.provider}toJSON(){return{kind:this.kind}}}class m0{constructor(e){this.kind="memoryLru",this._offlineComponentProvider={build:()=>new ah(e)}}toJSON(){return{kind:this.kind}}}function g0(){return new p0}function _0(n){return new m0(n==null?void 0:n.cacheSizeBytes)}function y0(n){return new d0(n)}function I0(n){return new f0(n)}class T0{constructor(e){this.forceOwnership=e,this.kind="persistentSingleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=Cn.provider,this._offlineComponentProvider={build:t=>new ch(t,e==null?void 0:e.cacheSizeBytes,this.forceOwnership)}}}class E0{constructor(){this.kind="PersistentMultipleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=Cn.provider,this._offlineComponentProvider={build:t=>new Ly(t,e==null?void 0:e.cacheSizeBytes)}}}function dI(n){return new T0(n==null?void 0:n.forceOwnership)}function v0(){return new E0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const w0={maxAttempts:5};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fI{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=wr(e)}set(e,t,r){this._verifyNotCommitted();const i=gn(e,this._firestore),s=hc(i.converter,t,r),o=ac(this._dataReader,"WriteBatch.set",i._key,s,i.converter!==null,r);return this._mutations.push(o.toMutation(i._key,ge.none())),this}update(e,t,r,...i){this._verifyNotCommitted();const s=gn(e,this._firestore);let o;return o=typeof(t=j(t))=="string"||t instanceof Mn?_h(this._dataReader,"WriteBatch.update",s._key,t,r,i):gh(this._dataReader,"WriteBatch.update",s._key,t),this._mutations.push(o.toMutation(s._key,ge.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=gn(e,this._firestore);return this._mutations=this._mutations.concat(new Ei(t._key,ge.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new N(R.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function gn(n,e){if((n=j(n)).firestore!==e)throw new N(R.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class A0{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=wr(e)}get(e){const t=gn(e,this._firestore),r=new Eh(this._firestore);return this._transaction.lookup([t._key]).then((i=>{if(!i||i.length!==1)return q(24041);const s=i[0];if(s.isFoundDocument())return new Bs(this._firestore,r,s.key,s,t.converter);if(s.isNoDocument())return new Bs(this._firestore,r,t._key,null,t.converter);throw q(18433,{doc:s})}))}set(e,t,r){const i=gn(e,this._firestore),s=hc(i.converter,t,r),o=ac(this._dataReader,"Transaction.set",i._key,s,i.converter!==null,r);return this._transaction.set(i._key,o),this}update(e,t,r,...i){const s=gn(e,this._firestore);let o;return o=typeof(t=j(t))=="string"||t instanceof Mn?_h(this._dataReader,"Transaction.update",s._key,t,r,i):gh(this._dataReader,"Transaction.update",s._key,t),this._transaction.update(s._key,o),this}delete(e){const t=gn(e,this._firestore);return this._transaction.delete(t._key),this}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pI extends A0{constructor(e,t){super(e,t),this._firestore=e}get(e){const t=gn(e,this._firestore),r=new Un(this._firestore);return super.get(e).then((i=>new nt(this._firestore,r,t._key,i._document,new $t(!1,!1),t.converter)))}}function b0(n,e,t){n=Y(n,oe);const r=Object.assign(Object.assign({},w0),t);return(function(s){if(s.maxAttempts<1)throw new N(R.INVALID_ARGUMENT,"Max attempts must be at least 1")})(r),(function(s,o,c){const u=new Oe;return s.asyncQueue.enqueueAndForget((async()=>{const l=await Uy(s);new nC(s.asyncQueue,l,c,o,u).zu()})),u.promise})(_e(n),(i=>e(new pI(n,i))),r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function R0(){return new to("deleteField")}function S0(){return new dh("serverTimestamp")}function P0(...n){return new fh("arrayUnion",n)}function C0(...n){return new ph("arrayRemove",n)}function k0(n){return new mh("increment",n)}function D0(n){return new ht(n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function N0(n){return _e(n=Y(n,oe)),new fI(n,(e=>Ci(n,e)))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function V0(n,e){const t=_e(n=Y(n,oe));if(!t._uninitializedComponentsProvider||t._uninitializedComponentsProvider._offline.kind==="memory")return Ke("Cannot enable indexes when persistence is disabled"),Promise.resolve();const r=(function(s){const o=typeof s=="string"?(function(l){try{return JSON.parse(l)}catch(d){throw new N(R.INVALID_ARGUMENT,"Failed to parse JSON: "+(d==null?void 0:d.message))}})(s):s,c=[];if(Array.isArray(o.indexes))for(const u of o.indexes){const l=Mp(u,"collectionGroup"),d=[];if(Array.isArray(u.fields))for(const p of u.fields){const m=cc("setIndexConfiguration",Mp(p,"fieldPath"));p.arrayConfig==="CONTAINS"?d.push(new nr(m,2)):p.order==="ASCENDING"?d.push(new nr(m,0)):p.order==="DESCENDING"&&d.push(new nr(m,1))}c.push(new Hr(Hr.UNKNOWN_ID,l,d,Qr.empty()))}return c})(e);return dC(t,r)}function Mp(n,e){if(typeof n[e]!="string")throw new N(R.INVALID_ARGUMENT,"Missing string value for: "+e);return n[e]}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mI{constructor(e){this._firestore=e,this.type="PersistentCacheIndexManager"}}function O0(n){var e;n=Y(n,oe);const t=Fp.get(n);if(t)return t;if(((e=_e(n)._uninitializedComponentsProvider)===null||e===void 0?void 0:e._offline.kind)!=="persistent")return null;const r=new mI(n);return Fp.set(n,r),r}function x0(n){gI(n,!0)}function L0(n){gI(n,!1)}function M0(n){pC(_e(n._firestore)).then((e=>V("deleting all persistent cache indexes succeeded"))).catch((e=>Ke("deleting all persistent cache indexes failed",e)))}function gI(n,e){fC(_e(n._firestore),e).then((t=>V(`setting persistent cache index auto creation isEnabled=${e} succeeded`))).catch((t=>Ke(`setting persistent cache index auto creation isEnabled=${e} failed`,t)))}const Fp=new WeakMap;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function F0(n){var e;const t=(e=_e(Y(n.firestore,oe))._onlineComponents)===null||e===void 0?void 0:e.datastore.serializer;return t===void 0?null:Ja(t,Ge(n._query)).Vt}function U0(n,e){var t;const r=Yg(e,((s,o)=>new D_(o,s.aggregateType,s._internalFieldPath))),i=(t=_e(Y(n.firestore,oe))._onlineComponents)===null||t===void 0?void 0:t.datastore.serializer;return i===void 0?null:j_(i,m_(n._query),r,!0).request}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class B0{constructor(){throw new Error("instances of this class should not be created")}static onExistenceFilterMismatch(e){return wh.instance.onExistenceFilterMismatch(e)}}class wh{constructor(){this.Fc=new Map}static get instance(){return Oo||(Oo=new wh,(function(t){if(da)throw new Error("a TestingHooksSpi instance is already set");da=t})(Oo)),Oo}ct(e){this.Fc.forEach((t=>t(e)))}onExistenceFilterMismatch(e){const t=Symbol(),r=this.Fc;return r.set(t,e),()=>r.delete(t)}}let Oo=null;(function(e,t=!0){(function(i){yi=i})(Ir),Et(new ft("firestore",((r,{instanceIdentifier:i,options:s})=>{const o=r.getProvider("app").getImmediate(),c=new oe(new Zb(r.getProvider("auth-internal")),new nR(o,r.getProvider("app-check-internal")),(function(l,d){if(!Object.prototype.hasOwnProperty.apply(l.options,["projectId"]))throw new N(R.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new An(l.options.projectId,d)})(o,i),o);return s=Object.assign({useFetchStreams:t},s),c._setSettings(s),c}),"PUBLIC").setMultipleInstances(!0)),tt(mf,gf,e),tt(mf,gf,"esm2017")})();const _N=Object.freeze(Object.defineProperty({__proto__:null,AbstractUserDataWriter:Th,AggregateField:di,AggregateQuerySnapshot:Jy,Bytes:Je,CACHE_SIZE_UNLIMITED:yC,CollectionReference:It,DocumentReference:ie,DocumentSnapshot:nt,FieldPath:Mn,FieldValue:Fn,Firestore:oe,FirestoreError:N,GeoPoint:Tt,LoadBundleTask:Wy,PersistentCacheIndexManager:mI,Query:Ce,QueryCompositeFilterConstraint:br,QueryConstraint:Si,QueryDocumentSnapshot:Ts,QueryEndAtConstraint:io,QueryFieldFilterConstraint:Pi,QueryLimitConstraint:no,QueryOrderByConstraint:lc,QuerySnapshot:rt,QueryStartAtConstraint:ro,SnapshotMetadata:$t,Timestamp:ne,Transaction:pI,VectorValue:ht,WriteBatch:fI,_AutoId:Ua,_ByteString:ye,_DatabaseId:An,_DocumentKey:x,_EmptyAppCheckTokenProvider:rR,_EmptyAuthCredentialsProvider:Cg,_FieldPath:he,_TestingHooks:B0,_cast:Y,_debugAssert:Jb,_internalAggregationQueryToProtoRunAggregationQueryRequest:U0,_internalQueryToProtoQueryTarget:F0,_isBase64Available:UR,_logWarn:Ke,_validateIsNotUsedTogether:Dg,addDoc:c0,aggregateFieldEqual:WC,aggregateQuerySnapshotEqual:HC,and:MC,arrayRemove:C0,arrayUnion:P0,average:KC,clearIndexedDbPersistence:wC,collection:mC,collectionGroup:gC,connectFirestoreEmulator:Gy,count:uI,deleteAllPersistentCacheIndexes:M0,deleteDoc:a0,deleteField:R0,disableNetwork:RC,disablePersistentCacheIndexAutoCreation:L0,doc:Ky,documentId:PC,documentSnapshotFromJSON:QC,enableIndexedDbPersistence:EC,enableMultiTabIndexedDbPersistence:vC,enableNetwork:bC,enablePersistentCacheIndexAutoCreation:x0,endAt:zC,endBefore:$C,ensureFirestoreConfigured:_e,executeWrite:Ci,getAggregateFromServer:hI,getCountFromServer:h0,getDoc:ZC,getDocFromCache:e0,getDocFromServer:t0,getDocs:n0,getDocsFromCache:r0,getDocsFromServer:i0,getFirestore:TC,getPersistentCacheIndexManager:O0,increment:k0,initializeFirestore:IC,limit:UC,limitToLast:BC,loadBundle:$u,memoryEagerGarbageCollector:g0,memoryLocalCache:y0,memoryLruGarbageCollector:_0,namedQuery:Yy,onSnapshot:zu,onSnapshotResume:u0,onSnapshotsInSync:l0,or:LC,orderBy:FC,persistentLocalCache:I0,persistentMultipleTabManager:v0,persistentSingleTabManager:dI,query:OC,queryEqual:hh,querySnapshotFromJSON:YC,refEqual:_C,runTransaction:b0,serverTimestamp:S0,setDoc:s0,setIndexConfiguration:V0,setLogLevel:Yb,snapshotEqual:XC,startAfter:jC,startAt:qC,sum:GC,terminate:SC,updateDoc:o0,vector:D0,waitForPendingWrites:AC,where:xC,writeBatch:N0},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _I="firebasestorage.googleapis.com",yI="storageBucket",q0=120*1e3,j0=600*1e3;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ve extends mt{constructor(e,t,r=0){super(iu(e),`Firebase Storage: ${t} (${iu(e)})`),this.status_=r,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,ve.prototype)}get status(){return this.status_}set status(e){this.status_=e}_codeEquals(e){return iu(e)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var Te;(function(n){n.UNKNOWN="unknown",n.OBJECT_NOT_FOUND="object-not-found",n.BUCKET_NOT_FOUND="bucket-not-found",n.PROJECT_NOT_FOUND="project-not-found",n.QUOTA_EXCEEDED="quota-exceeded",n.UNAUTHENTICATED="unauthenticated",n.UNAUTHORIZED="unauthorized",n.UNAUTHORIZED_APP="unauthorized-app",n.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",n.INVALID_CHECKSUM="invalid-checksum",n.CANCELED="canceled",n.INVALID_EVENT_NAME="invalid-event-name",n.INVALID_URL="invalid-url",n.INVALID_DEFAULT_BUCKET="invalid-default-bucket",n.NO_DEFAULT_BUCKET="no-default-bucket",n.CANNOT_SLICE_BLOB="cannot-slice-blob",n.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",n.NO_DOWNLOAD_URL="no-download-url",n.INVALID_ARGUMENT="invalid-argument",n.INVALID_ARGUMENT_COUNT="invalid-argument-count",n.APP_DELETED="app-deleted",n.INVALID_ROOT_OPERATION="invalid-root-operation",n.INVALID_FORMAT="invalid-format",n.INTERNAL_ERROR="internal-error",n.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(Te||(Te={}));function iu(n){return"storage/"+n}function Ah(){const n="An unknown error occurred, please check the error payload for server response.";return new ve(Te.UNKNOWN,n)}function $0(n){return new ve(Te.OBJECT_NOT_FOUND,"Object '"+n+"' does not exist.")}function z0(n){return new ve(Te.QUOTA_EXCEEDED,"Quota for bucket '"+n+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}function G0(){const n="User is not authenticated, please authenticate using Firebase Authentication and try again.";return new ve(Te.UNAUTHENTICATED,n)}function K0(){return new ve(Te.UNAUTHORIZED_APP,"This app does not have permission to access Firebase Storage on this project.")}function W0(n){return new ve(Te.UNAUTHORIZED,"User does not have permission to access '"+n+"'.")}function H0(){return new ve(Te.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function Q0(){return new ve(Te.CANCELED,"User canceled the upload/download.")}function Y0(n){return new ve(Te.INVALID_URL,"Invalid URL '"+n+"'.")}function J0(n){return new ve(Te.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+n+"'.")}function X0(){return new ve(Te.NO_DEFAULT_BUCKET,"No default bucket found. Did you set the '"+yI+"' property when initializing the app?")}function Z0(){return new ve(Te.CANNOT_SLICE_BLOB,"Cannot slice blob for upload. Please retry the upload.")}function ek(){return new ve(Te.NO_DOWNLOAD_URL,"The given file does not have any download URLs.")}function tk(n){return new ve(Te.UNSUPPORTED_ENVIRONMENT,`${n} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`)}function Gu(n){return new ve(Te.INVALID_ARGUMENT,n)}function II(){return new ve(Te.APP_DELETED,"The Firebase app was deleted.")}function nk(n){return new ve(Te.INVALID_ROOT_OPERATION,"The operation '"+n+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}function Es(n,e){return new ve(Te.INVALID_FORMAT,"String does not match format '"+n+"': "+e)}function Zi(n){throw new ve(Te.INTERNAL_ERROR,"Internal error: "+n)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ct{constructor(e,t){this.bucket=e,this.path_=t}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const e=encodeURIComponent;return"/b/"+e(this.bucket)+"/o/"+e(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(e,t){let r;try{r=ct.makeFromUrl(e,t)}catch{return new ct(e,"")}if(r.path==="")return r;throw J0(e)}static makeFromUrl(e,t){let r=null;const i="([A-Za-z0-9.\\-_]+)";function s(G){G.path.charAt(G.path.length-1)==="/"&&(G.path_=G.path_.slice(0,-1))}const o="(/(.*))?$",c=new RegExp("^gs://"+i+o,"i"),u={bucket:1,path:3};function l(G){G.path_=decodeURIComponent(G.path)}const d="v[A-Za-z0-9_]+",p=t.replace(/[.]/g,"\\."),m="(/([^?#]*).*)?$",T=new RegExp(`^https?://${p}/${d}/b/${i}/o${m}`,"i"),P={bucket:1,path:3},D=t===_I?"(?:storage.googleapis.com|storage.cloud.google.com)":t,k="([^?#]*)",U=new RegExp(`^https?://${D}/${i}/${k}`,"i"),M=[{regex:c,indices:u,postModify:s},{regex:T,indices:P,postModify:l},{regex:U,indices:{bucket:1,path:2},postModify:l}];for(let G=0;G<M.length;G++){const J=M[G],W=J.regex.exec(e);if(W){const E=W[J.indices.bucket];let _=W[J.indices.path];_||(_=""),r=new ct(E,_),J.postModify(r);break}}if(r==null)throw Y0(e);return r}}class rk{constructor(e){this.promise_=Promise.reject(e)}getPromise(){return this.promise_}cancel(e=!1){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ik(n,e,t){let r=1,i=null,s=null,o=!1,c=0;function u(){return c===2}let l=!1;function d(...k){l||(l=!0,e.apply(null,k))}function p(k){i=setTimeout(()=>{i=null,n(T,u())},k)}function m(){s&&clearTimeout(s)}function T(k,...U){if(l){m();return}if(k){m(),d.call(null,k,...U);return}if(u()||o){m(),d.call(null,k,...U);return}r<64&&(r*=2);let M;c===1?(c=2,M=0):M=(r+Math.random())*1e3,p(M)}let P=!1;function D(k){P||(P=!0,m(),!l&&(i!==null?(k||(c=2),clearTimeout(i),p(0)):k||(c=1)))}return p(0),s=setTimeout(()=>{o=!0,D(!0)},t),D}function sk(n){n(!1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ok(n){return n!==void 0}function ak(n){return typeof n=="object"&&!Array.isArray(n)}function bh(n){return typeof n=="string"||n instanceof String}function Up(n){return Rh()&&n instanceof Blob}function Rh(){return typeof Blob<"u"}function Bp(n,e,t,r){if(r<e)throw Gu(`Invalid value for '${n}'. Expected ${e} or greater.`);if(r>t)throw Gu(`Invalid value for '${n}'. Expected ${t} or less.`)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Sh(n,e,t){let r=e;return t==null&&(r=`https://${e}`),`${t}://${r}/v0${n}`}function TI(n){const e=encodeURIComponent;let t="?";for(const r in n)if(n.hasOwnProperty(r)){const i=e(r)+"="+e(n[r]);t=t+i+"&"}return t=t.slice(0,-1),t}var sr;(function(n){n[n.NO_ERROR=0]="NO_ERROR",n[n.NETWORK_ERROR=1]="NETWORK_ERROR",n[n.ABORT=2]="ABORT"})(sr||(sr={}));/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ck(n,e){const t=n>=500&&n<600,i=[408,429].indexOf(n)!==-1,s=e.indexOf(n)!==-1;return t||i||s}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uk{constructor(e,t,r,i,s,o,c,u,l,d,p,m=!0,T=!1){this.url_=e,this.method_=t,this.headers_=r,this.body_=i,this.successCodes_=s,this.additionalRetryCodes_=o,this.callback_=c,this.errorCallback_=u,this.timeout_=l,this.progressCallback_=d,this.connectionFactory_=p,this.retry=m,this.isUsingEmulator=T,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((P,D)=>{this.resolve_=P,this.reject_=D,this.start_()})}start_(){const e=(r,i)=>{if(i){r(!1,new xo(!1,null,!0));return}const s=this.connectionFactory_();this.pendingConnection_=s;const o=c=>{const u=c.loaded,l=c.lengthComputable?c.total:-1;this.progressCallback_!==null&&this.progressCallback_(u,l)};this.progressCallback_!==null&&s.addUploadProgressListener(o),s.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&s.removeUploadProgressListener(o),this.pendingConnection_=null;const c=s.getErrorCode()===sr.NO_ERROR,u=s.getStatus();if(!c||ck(u,this.additionalRetryCodes_)&&this.retry){const d=s.getErrorCode()===sr.ABORT;r(!1,new xo(!1,null,d));return}const l=this.successCodes_.indexOf(u)!==-1;r(!0,new xo(l,s))})},t=(r,i)=>{const s=this.resolve_,o=this.reject_,c=i.connection;if(i.wasSuccessCode)try{const u=this.callback_(c,c.getResponse());ok(u)?s(u):s()}catch(u){o(u)}else if(c!==null){const u=Ah();u.serverResponse=c.getErrorText(),this.errorCallback_?o(this.errorCallback_(c,u)):o(u)}else if(i.canceled){const u=this.appDelete_?II():Q0();o(u)}else{const u=H0();o(u)}};this.canceled_?t(!1,new xo(!1,null,!0)):this.backoffId_=ik(e,t,this.timeout_)}getPromise(){return this.promise_}cancel(e){this.canceled_=!0,this.appDelete_=e||!1,this.backoffId_!==null&&sk(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class xo{constructor(e,t,r){this.wasSuccessCode=e,this.connection=t,this.canceled=!!r}}function lk(n,e){e!==null&&e.length>0&&(n.Authorization="Firebase "+e)}function hk(n,e){n["X-Firebase-Storage-Version"]="webjs/"+(e??"AppManager")}function dk(n,e){e&&(n["X-Firebase-GMPID"]=e)}function fk(n,e){e!==null&&(n["X-Firebase-AppCheck"]=e)}function pk(n,e,t,r,i,s,o=!0,c=!1){const u=TI(n.urlParams),l=n.url+u,d=Object.assign({},n.headers);return dk(d,e),lk(d,t),hk(d,s),fk(d,r),new uk(l,n.method,d,n.body,n.successCodes,n.additionalRetryCodes,n.handler,n.errorHandler,n.timeout,n.progressCallback,i,o,c)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mk(){return typeof BlobBuilder<"u"?BlobBuilder:typeof WebKitBlobBuilder<"u"?WebKitBlobBuilder:void 0}function gk(...n){const e=mk();if(e!==void 0){const t=new e;for(let r=0;r<n.length;r++)t.append(n[r]);return t.getBlob()}else{if(Rh())return new Blob(n);throw new ve(Te.UNSUPPORTED_ENVIRONMENT,"This browser doesn't seem to support creating Blobs")}}function _k(n,e,t){return n.webkitSlice?n.webkitSlice(e,t):n.mozSlice?n.mozSlice(e,t):n.slice?n.slice(e,t):null}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yk(n){if(typeof atob>"u")throw tk("base-64");return atob(n)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const St={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"};class su{constructor(e,t){this.data=e,this.contentType=t||null}}function Ik(n,e){switch(n){case St.RAW:return new su(EI(e));case St.BASE64:case St.BASE64URL:return new su(vI(n,e));case St.DATA_URL:return new su(Ek(e),vk(e))}throw Ah()}function EI(n){const e=[];for(let t=0;t<n.length;t++){let r=n.charCodeAt(t);if(r<=127)e.push(r);else if(r<=2047)e.push(192|r>>6,128|r&63);else if((r&64512)===55296)if(!(t<n.length-1&&(n.charCodeAt(t+1)&64512)===56320))e.push(239,191,189);else{const s=r,o=n.charCodeAt(++t);r=65536|(s&1023)<<10|o&1023,e.push(240|r>>18,128|r>>12&63,128|r>>6&63,128|r&63)}else(r&64512)===56320?e.push(239,191,189):e.push(224|r>>12,128|r>>6&63,128|r&63)}return new Uint8Array(e)}function Tk(n){let e;try{e=decodeURIComponent(n)}catch{throw Es(St.DATA_URL,"Malformed data URL.")}return EI(e)}function vI(n,e){switch(n){case St.BASE64:{const i=e.indexOf("-")!==-1,s=e.indexOf("_")!==-1;if(i||s)throw Es(n,"Invalid character '"+(i?"-":"_")+"' found: is it base64url encoded?");break}case St.BASE64URL:{const i=e.indexOf("+")!==-1,s=e.indexOf("/")!==-1;if(i||s)throw Es(n,"Invalid character '"+(i?"+":"/")+"' found: is it base64 encoded?");e=e.replace(/-/g,"+").replace(/_/g,"/");break}}let t;try{t=yk(e)}catch(i){throw i.message.includes("polyfill")?i:Es(n,"Invalid character found")}const r=new Uint8Array(t.length);for(let i=0;i<t.length;i++)r[i]=t.charCodeAt(i);return r}class wI{constructor(e){this.base64=!1,this.contentType=null;const t=e.match(/^data:([^,]+)?,/);if(t===null)throw Es(St.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");const r=t[1]||null;r!=null&&(this.base64=wk(r,";base64"),this.contentType=this.base64?r.substring(0,r.length-7):r),this.rest=e.substring(e.indexOf(",")+1)}}function Ek(n){const e=new wI(n);return e.base64?vI(St.BASE64,e.rest):Tk(e.rest)}function vk(n){return new wI(n).contentType}function wk(n,e){return n.length>=e.length?n.substring(n.length-e.length)===e:!1}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pn{constructor(e,t){let r=0,i="";Up(e)?(this.data_=e,r=e.size,i=e.type):e instanceof ArrayBuffer?(t?this.data_=new Uint8Array(e):(this.data_=new Uint8Array(e.byteLength),this.data_.set(new Uint8Array(e))),r=this.data_.length):e instanceof Uint8Array&&(t?this.data_=e:(this.data_=new Uint8Array(e.length),this.data_.set(e)),r=e.length),this.size_=r,this.type_=i}size(){return this.size_}type(){return this.type_}slice(e,t){if(Up(this.data_)){const r=this.data_,i=_k(r,e,t);return i===null?null:new pn(i)}else{const r=new Uint8Array(this.data_.buffer,e,t-e);return new pn(r,!0)}}static getBlob(...e){if(Rh()){const t=e.map(r=>r instanceof pn?r.data_:r);return new pn(gk.apply(null,t))}else{const t=e.map(o=>bh(o)?Ik(St.RAW,o).data:o.data_);let r=0;t.forEach(o=>{r+=o.byteLength});const i=new Uint8Array(r);let s=0;return t.forEach(o=>{for(let c=0;c<o.length;c++)i[s++]=o[c]}),new pn(i,!0)}}uploadData(){return this.data_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function AI(n){let e;try{e=JSON.parse(n)}catch{return null}return ak(e)?e:null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ak(n){if(n.length===0)return null;const e=n.lastIndexOf("/");return e===-1?"":n.slice(0,e)}function bk(n,e){const t=e.split("/").filter(r=>r.length>0).join("/");return n.length===0?t:n+"/"+t}function bI(n){const e=n.lastIndexOf("/",n.length-2);return e===-1?n:n.slice(e+1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rk(n,e){return e}class Qe{constructor(e,t,r,i){this.server=e,this.local=t||e,this.writable=!!r,this.xform=i||Rk}}let Lo=null;function Sk(n){return!bh(n)||n.length<2?n:bI(n)}function RI(){if(Lo)return Lo;const n=[];n.push(new Qe("bucket")),n.push(new Qe("generation")),n.push(new Qe("metageneration")),n.push(new Qe("name","fullPath",!0));function e(s,o){return Sk(o)}const t=new Qe("name");t.xform=e,n.push(t);function r(s,o){return o!==void 0?Number(o):o}const i=new Qe("size");return i.xform=r,n.push(i),n.push(new Qe("timeCreated")),n.push(new Qe("updated")),n.push(new Qe("md5Hash",null,!0)),n.push(new Qe("cacheControl",null,!0)),n.push(new Qe("contentDisposition",null,!0)),n.push(new Qe("contentEncoding",null,!0)),n.push(new Qe("contentLanguage",null,!0)),n.push(new Qe("contentType",null,!0)),n.push(new Qe("metadata","customMetadata",!0)),Lo=n,Lo}function Pk(n,e){function t(){const r=n.bucket,i=n.fullPath,s=new ct(r,i);return e._makeStorageReference(s)}Object.defineProperty(n,"ref",{get:t})}function Ck(n,e,t){const r={};r.type="file";const i=t.length;for(let s=0;s<i;s++){const o=t[s];r[o.local]=o.xform(r,e[o.server])}return Pk(r,n),r}function SI(n,e,t){const r=AI(e);return r===null?null:Ck(n,r,t)}function kk(n,e,t,r){const i=AI(e);if(i===null||!bh(i.downloadTokens))return null;const s=i.downloadTokens;if(s.length===0)return null;const o=encodeURIComponent;return s.split(",").map(l=>{const d=n.bucket,p=n.fullPath,m="/b/"+o(d)+"/o/"+o(p),T=Sh(m,t,r),P=TI({alt:"media",token:l});return T+P})[0]}function Dk(n,e){const t={},r=e.length;for(let i=0;i<r;i++){const s=e[i];s.writable&&(t[s.server]=n[s.local])}return JSON.stringify(t)}class PI{constructor(e,t,r,i){this.url=e,this.method=t,this.handler=r,this.timeout=i,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function CI(n){if(!n)throw Ah()}function Nk(n,e){function t(r,i){const s=SI(n,i,e);return CI(s!==null),s}return t}function Vk(n,e){function t(r,i){const s=SI(n,i,e);return CI(s!==null),kk(s,i,n.host,n._protocol)}return t}function kI(n){function e(t,r){let i;return t.getStatus()===401?t.getErrorText().includes("Firebase App Check token is invalid")?i=K0():i=G0():t.getStatus()===402?i=z0(n.bucket):t.getStatus()===403?i=W0(n.path):i=r,i.status=t.getStatus(),i.serverResponse=r.serverResponse,i}return e}function Ok(n){const e=kI(n);function t(r,i){let s=e(r,i);return r.getStatus()===404&&(s=$0(n.path)),s.serverResponse=i.serverResponse,s}return t}function xk(n,e,t){const r=e.fullServerUrl(),i=Sh(r,n.host,n._protocol),s="GET",o=n.maxOperationRetryTime,c=new PI(i,s,Vk(n,t),o);return c.errorHandler=Ok(e),c}function Lk(n,e){return n&&n.contentType||e&&e.type()||"application/octet-stream"}function Mk(n,e,t){const r=Object.assign({},t);return r.fullPath=n.path,r.size=e.size(),r.contentType||(r.contentType=Lk(null,e)),r}function Fk(n,e,t,r,i){const s=e.bucketOnlyServerUrl(),o={"X-Goog-Upload-Protocol":"multipart"};function c(){let M="";for(let G=0;G<2;G++)M=M+Math.random().toString().slice(2);return M}const u=c();o["Content-Type"]="multipart/related; boundary="+u;const l=Mk(e,r,i),d=Dk(l,t),p="--"+u+`\r
Content-Type: application/json; charset=utf-8\r
\r
`+d+`\r
--`+u+`\r
Content-Type: `+l.contentType+`\r
\r
`,m=`\r
--`+u+"--",T=pn.getBlob(p,r,m);if(T===null)throw Z0();const P={name:l.fullPath},D=Sh(s,n.host,n._protocol),k="POST",U=n.maxUploadRetryTime,B=new PI(D,k,Nk(n,t),U);return B.urlParams=P,B.headers=o,B.body=T.uploadData(),B.errorHandler=kI(e),B}class Uk{constructor(){this.sent_=!1,this.xhr_=new XMLHttpRequest,this.initXhr(),this.errorCode_=sr.NO_ERROR,this.sendPromise_=new Promise(e=>{this.xhr_.addEventListener("abort",()=>{this.errorCode_=sr.ABORT,e()}),this.xhr_.addEventListener("error",()=>{this.errorCode_=sr.NETWORK_ERROR,e()}),this.xhr_.addEventListener("load",()=>{e()})})}send(e,t,r,i,s){if(this.sent_)throw Zi("cannot .send() more than once");if(Yt(e)&&r&&(this.xhr_.withCredentials=!0),this.sent_=!0,this.xhr_.open(t,e,!0),s!==void 0)for(const o in s)s.hasOwnProperty(o)&&this.xhr_.setRequestHeader(o,s[o].toString());return i!==void 0?this.xhr_.send(i):this.xhr_.send(),this.sendPromise_}getErrorCode(){if(!this.sent_)throw Zi("cannot .getErrorCode() before sending");return this.errorCode_}getStatus(){if(!this.sent_)throw Zi("cannot .getStatus() before sending");try{return this.xhr_.status}catch{return-1}}getResponse(){if(!this.sent_)throw Zi("cannot .getResponse() before sending");return this.xhr_.response}getErrorText(){if(!this.sent_)throw Zi("cannot .getErrorText() before sending");return this.xhr_.statusText}abort(){this.xhr_.abort()}getResponseHeader(e){return this.xhr_.getResponseHeader(e)}addUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.addEventListener("progress",e)}removeUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.removeEventListener("progress",e)}}class Bk extends Uk{initXhr(){this.xhr_.responseType="text"}}function DI(){return new Bk}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mr{constructor(e,t){this._service=e,t instanceof ct?this._location=t:this._location=ct.makeFromUrl(t,e.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(e,t){return new mr(e,t)}get root(){const e=new ct(this._location.bucket,"");return this._newRef(this._service,e)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return bI(this._location.path)}get storage(){return this._service}get parent(){const e=Ak(this._location.path);if(e===null)return null;const t=new ct(this._location.bucket,e);return new mr(this._service,t)}_throwIfRoot(e){if(this._location.path==="")throw nk(e)}}function qk(n,e,t){n._throwIfRoot("uploadBytes");const r=Fk(n.storage,n._location,RI(),new pn(e,!0),t);return n.storage.makeRequestWithTokens(r,DI).then(i=>({metadata:i,ref:n}))}function jk(n){n._throwIfRoot("getDownloadURL");const e=xk(n.storage,n._location,RI());return n.storage.makeRequestWithTokens(e,DI).then(t=>{if(t===null)throw ek();return t})}function $k(n,e){const t=bk(n._location.path,e),r=new ct(n._location.bucket,t);return new mr(n.storage,r)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zk(n){return/^[A-Za-z]+:\/\//.test(n)}function Gk(n,e){return new mr(n,e)}function NI(n,e){if(n instanceof Ph){const t=n;if(t._bucket==null)throw X0();const r=new mr(t,t._bucket);return e!=null?NI(r,e):r}else return e!==void 0?$k(n,e):n}function Kk(n,e){if(e&&zk(e)){if(n instanceof Ph)return Gk(n,e);throw Gu("To use ref(service, url), the first argument must be a Storage instance.")}else return NI(n,e)}function qp(n,e){const t=e==null?void 0:e[yI];return t==null?null:ct.makeFromBucketSpec(t,n)}function Wk(n,e,t,r={}){n.host=`${e}:${t}`;const i=Yt(e);i&&(ba(`https://${n.host}/b`),Wu("Storage",!0)),n._isUsingEmulator=!0,n._protocol=i?"https":"http";const{mockUserToken:s}=r;s&&(n._overrideAuthToken=typeof s=="string"?s:om(s,n.app.options.projectId))}class Ph{constructor(e,t,r,i,s,o=!1){this.app=e,this._authProvider=t,this._appCheckProvider=r,this._url=i,this._firebaseVersion=s,this._isUsingEmulator=o,this._bucket=null,this._host=_I,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=q0,this._maxUploadRetryTime=j0,this._requests=new Set,i!=null?this._bucket=ct.makeFromBucketSpec(i,this._host):this._bucket=qp(this._host,this.app.options)}get host(){return this._host}set host(e){this._host=e,this._url!=null?this._bucket=ct.makeFromBucketSpec(this._url,e):this._bucket=qp(e,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(e){Bp("time",0,Number.POSITIVE_INFINITY,e),this._maxUploadRetryTime=e}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(e){Bp("time",0,Number.POSITIVE_INFINITY,e),this._maxOperationRetryTime=e}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const e=this._authProvider.getImmediate({optional:!0});if(e){const t=await e.getToken();if(t!==null)return t.accessToken}return null}async _getAppCheckToken(){if(me(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=this._appCheckProvider.getImmediate({optional:!0});return e?(await e.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(e=>e.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(e){return new mr(this,e)}_makeRequest(e,t,r,i,s=!0){if(this._deleted)return new rk(II());{const o=pk(e,this._appId,r,i,t,this._firebaseVersion,s,this._isUsingEmulator);return this._requests.add(o),o.getPromise().then(()=>this._requests.delete(o),()=>this._requests.delete(o)),o}}async makeRequestWithTokens(e,t){const[r,i]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(e,t,r,i).getPromise()}}const jp="@firebase/storage",$p="0.13.14";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const VI="storage";function yN(n,e,t){return n=j(n),qk(n,e,t)}function IN(n){return n=j(n),jk(n)}function TN(n,e){return n=j(n),Kk(n,e)}function EN(n=Pa(),e){n=j(n);const r=Nt(n,VI).getImmediate({identifier:e}),i=rm("storage");return i&&Hk(r,...i),r}function Hk(n,e,t,r={}){Wk(n,e,t,r)}function Qk(n,{instanceIdentifier:e}){const t=n.getProvider("app").getImmediate(),r=n.getProvider("auth-internal"),i=n.getProvider("app-check-internal");return new Ph(t,r,i,e,Ir)}function Yk(){Et(new ft(VI,Qk,"PUBLIC").setMultipleInstances(!0)),tt(jp,$p,""),tt(jp,$p,"esm2017")}Yk();const OI="@firebase/installations",Ch="0.6.18";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xI=1e4,LI=`w:${Ch}`,MI="FIS_v2",Jk="https://firebaseinstallations.googleapis.com/v1",Xk=3600*1e3,Zk="installations",eD="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tD={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},gr=new yr(Zk,eD,tD);function FI(n){return n instanceof mt&&n.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function UI({projectId:n}){return`${Jk}/projects/${n}/installations`}function BI(n){return{token:n.token,requestStatus:2,expiresIn:rD(n.expiresIn),creationTime:Date.now()}}async function qI(n,e){const r=(await e.json()).error;return gr.create("request-failed",{requestName:n,serverCode:r.code,serverMessage:r.message,serverStatus:r.status})}function jI({apiKey:n}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":n})}function nD(n,{refreshToken:e}){const t=jI(n);return t.append("Authorization",iD(e)),t}async function $I(n){const e=await n();return e.status>=500&&e.status<600?n():e}function rD(n){return Number(n.replace("s","000"))}function iD(n){return`${MI} ${n}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function sD({appConfig:n,heartbeatServiceProvider:e},{fid:t}){const r=UI(n),i=jI(n),s=e.getImmediate({optional:!0});if(s){const l=await s.getHeartbeatsHeader();l&&i.append("x-firebase-client",l)}const o={fid:t,authVersion:MI,appId:n.appId,sdkVersion:LI},c={method:"POST",headers:i,body:JSON.stringify(o)},u=await $I(()=>fetch(r,c));if(u.ok){const l=await u.json();return{fid:l.fid||t,registrationStatus:2,refreshToken:l.refreshToken,authToken:BI(l.authToken)}}else throw await qI("Create Installation",u)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zI(n){return new Promise(e=>{setTimeout(e,n)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function oD(n){return btoa(String.fromCharCode(...n)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const aD=/^[cdef][\w-]{21}$/,Ku="";function cD(){try{const n=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(n),n[0]=112+n[0]%16;const t=uD(n);return aD.test(t)?t:Ku}catch{return Ku}}function uD(n){return oD(n).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dc(n){return`${n.appName}!${n.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const GI=new Map;function KI(n,e){const t=dc(n);WI(t,e),lD(t,e)}function WI(n,e){const t=GI.get(n);if(t)for(const r of t)r(e)}function lD(n,e){const t=hD();t&&t.postMessage({key:n,fid:e}),dD()}let er=null;function hD(){return!er&&"BroadcastChannel"in self&&(er=new BroadcastChannel("[Firebase] FID Change"),er.onmessage=n=>{WI(n.data.key,n.data.fid)}),er}function dD(){GI.size===0&&er&&(er.close(),er=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fD="firebase-installations-database",pD=1,_r="firebase-installations-store";let ou=null;function kh(){return ou||(ou=fm(fD,pD,{upgrade:(n,e)=>{switch(e){case 0:n.createObjectStore(_r)}}})),ou}async function va(n,e){const t=dc(n),i=(await kh()).transaction(_r,"readwrite"),s=i.objectStore(_r),o=await s.get(t);return await s.put(e,t),await i.done,(!o||o.fid!==e.fid)&&KI(n,e.fid),e}async function HI(n){const e=dc(n),r=(await kh()).transaction(_r,"readwrite");await r.objectStore(_r).delete(e),await r.done}async function fc(n,e){const t=dc(n),i=(await kh()).transaction(_r,"readwrite"),s=i.objectStore(_r),o=await s.get(t),c=e(o);return c===void 0?await s.delete(t):await s.put(c,t),await i.done,c&&(!o||o.fid!==c.fid)&&KI(n,c.fid),c}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Dh(n){let e;const t=await fc(n.appConfig,r=>{const i=mD(r),s=gD(n,i);return e=s.registrationPromise,s.installationEntry});return t.fid===Ku?{installationEntry:await e}:{installationEntry:t,registrationPromise:e}}function mD(n){const e=n||{fid:cD(),registrationStatus:0};return QI(e)}function gD(n,e){if(e.registrationStatus===0){if(!navigator.onLine){const i=Promise.reject(gr.create("app-offline"));return{installationEntry:e,registrationPromise:i}}const t={fid:e.fid,registrationStatus:1,registrationTime:Date.now()},r=_D(n,t);return{installationEntry:t,registrationPromise:r}}else return e.registrationStatus===1?{installationEntry:e,registrationPromise:yD(n)}:{installationEntry:e}}async function _D(n,e){try{const t=await sD(n,e);return va(n.appConfig,t)}catch(t){throw FI(t)&&t.customData.serverCode===409?await HI(n.appConfig):await va(n.appConfig,{fid:e.fid,registrationStatus:0}),t}}async function yD(n){let e=await zp(n.appConfig);for(;e.registrationStatus===1;)await zI(100),e=await zp(n.appConfig);if(e.registrationStatus===0){const{installationEntry:t,registrationPromise:r}=await Dh(n);return r||t}return e}function zp(n){return fc(n,e=>{if(!e)throw gr.create("installation-not-found");return QI(e)})}function QI(n){return ID(n)?{fid:n.fid,registrationStatus:0}:n}function ID(n){return n.registrationStatus===1&&n.registrationTime+xI<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function TD({appConfig:n,heartbeatServiceProvider:e},t){const r=ED(n,t),i=nD(n,t),s=e.getImmediate({optional:!0});if(s){const l=await s.getHeartbeatsHeader();l&&i.append("x-firebase-client",l)}const o={installation:{sdkVersion:LI,appId:n.appId}},c={method:"POST",headers:i,body:JSON.stringify(o)},u=await $I(()=>fetch(r,c));if(u.ok){const l=await u.json();return BI(l)}else throw await qI("Generate Auth Token",u)}function ED(n,{fid:e}){return`${UI(n)}/${e}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Nh(n,e=!1){let t;const r=await fc(n.appConfig,s=>{if(!YI(s))throw gr.create("not-registered");const o=s.authToken;if(!e&&AD(o))return s;if(o.requestStatus===1)return t=vD(n,e),s;{if(!navigator.onLine)throw gr.create("app-offline");const c=RD(s);return t=wD(n,c),c}});return t?await t:r.authToken}async function vD(n,e){let t=await Gp(n.appConfig);for(;t.authToken.requestStatus===1;)await zI(100),t=await Gp(n.appConfig);const r=t.authToken;return r.requestStatus===0?Nh(n,e):r}function Gp(n){return fc(n,e=>{if(!YI(e))throw gr.create("not-registered");const t=e.authToken;return SD(t)?Object.assign(Object.assign({},e),{authToken:{requestStatus:0}}):e})}async function wD(n,e){try{const t=await TD(n,e),r=Object.assign(Object.assign({},e),{authToken:t});return await va(n.appConfig,r),t}catch(t){if(FI(t)&&(t.customData.serverCode===401||t.customData.serverCode===404))await HI(n.appConfig);else{const r=Object.assign(Object.assign({},e),{authToken:{requestStatus:0}});await va(n.appConfig,r)}throw t}}function YI(n){return n!==void 0&&n.registrationStatus===2}function AD(n){return n.requestStatus===2&&!bD(n)}function bD(n){const e=Date.now();return e<n.creationTime||n.creationTime+n.expiresIn<e+Xk}function RD(n){const e={requestStatus:1,requestTime:Date.now()};return Object.assign(Object.assign({},n),{authToken:e})}function SD(n){return n.requestStatus===1&&n.requestTime+xI<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function PD(n){const e=n,{installationEntry:t,registrationPromise:r}=await Dh(e);return r?r.catch(console.error):Nh(e).catch(console.error),t.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function CD(n,e=!1){const t=n;return await kD(t),(await Nh(t,e)).token}async function kD(n){const{registrationPromise:e}=await Dh(n);e&&await e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function DD(n){if(!n||!n.options)throw au("App Configuration");if(!n.name)throw au("App Name");const e=["projectId","apiKey","appId"];for(const t of e)if(!n.options[t])throw au(t);return{appName:n.name,projectId:n.options.projectId,apiKey:n.options.apiKey,appId:n.options.appId}}function au(n){return gr.create("missing-app-config-values",{valueName:n})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const JI="installations",ND="installations-internal",VD=n=>{const e=n.getProvider("app").getImmediate(),t=DD(e),r=Nt(e,"heartbeat");return{app:e,appConfig:t,heartbeatServiceProvider:r,_delete:()=>Promise.resolve()}},OD=n=>{const e=n.getProvider("app").getImmediate(),t=Nt(e,JI).getImmediate();return{getId:()=>PD(t),getToken:i=>CD(t,i)}};function xD(){Et(new ft(JI,VD,"PUBLIC")),Et(new ft(ND,OD,"PRIVATE"))}xD();tt(OI,Ch);tt(OI,Ch,"esm2017");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wa="analytics",LD="firebase_id",MD="origin",FD=60*1e3,UD="https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig",Vh="https://www.googletagmanager.com/gtag/js";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const it=new Sa("@firebase/analytics");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const BD={"already-exists":"A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.","already-initialized":"initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.","already-initialized-settings":"Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.","interop-component-reg-failed":"Firebase Analytics Interop Component failed to instantiate: {$reason}","invalid-analytics-context":"Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","indexeddb-unavailable":"IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","fetch-throttle":"The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.","config-fetch-failed":"Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}","no-api-key":'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.',"no-app-id":'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.',"no-client-id":'The "client_id" field is empty.',"invalid-gtag-resource":"Trusted Types detected an invalid gtag resource: {$gtagURL}."},ut=new yr("analytics","Analytics",BD);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qD(n){if(!n.startsWith(Vh)){const e=ut.create("invalid-gtag-resource",{gtagURL:n});return it.warn(e.message),""}return n}function XI(n){return Promise.all(n.map(e=>e.catch(t=>t)))}function jD(n,e){let t;return window.trustedTypes&&(t=window.trustedTypes.createPolicy(n,e)),t}function $D(n,e){const t=jD("firebase-js-sdk-policy",{createScriptURL:qD}),r=document.createElement("script"),i=`${Vh}?l=${n}&id=${e}`;r.src=t?t==null?void 0:t.createScriptURL(i):i,r.async=!0,document.head.appendChild(r)}function zD(n){let e=[];return Array.isArray(window[n])?e=window[n]:window[n]=e,e}async function GD(n,e,t,r,i,s){const o=r[i];try{if(o)await e[o];else{const u=(await XI(t)).find(l=>l.measurementId===i);u&&await e[u.appId]}}catch(c){it.error(c)}n("config",i,s)}async function KD(n,e,t,r,i){try{let s=[];if(i&&i.send_to){let o=i.send_to;Array.isArray(o)||(o=[o]);const c=await XI(t);for(const u of o){const l=c.find(p=>p.measurementId===u),d=l&&e[l.appId];if(d)s.push(d);else{s=[];break}}}s.length===0&&(s=Object.values(e)),await Promise.all(s),n("event",r,i||{})}catch(s){it.error(s)}}function WD(n,e,t,r){async function i(s,...o){try{if(s==="event"){const[c,u]=o;await KD(n,e,t,c,u)}else if(s==="config"){const[c,u]=o;await GD(n,e,t,r,c,u)}else if(s==="consent"){const[c,u]=o;n("consent",c,u)}else if(s==="get"){const[c,u,l]=o;n("get",c,u,l)}else if(s==="set"){const[c]=o;n("set",c)}else n(s,...o)}catch(c){it.error(c)}}return i}function HD(n,e,t,r,i){let s=function(...o){window[r].push(arguments)};return window[i]&&typeof window[i]=="function"&&(s=window[i]),window[i]=WD(s,n,e,t),{gtagCore:s,wrappedGtag:window[i]}}function QD(n){const e=window.document.getElementsByTagName("script");for(const t of Object.values(e))if(t.src&&t.src.includes(Vh)&&t.src.includes(n))return t;return null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const YD=30,JD=1e3;class XD{constructor(e={},t=JD){this.throttleMetadata=e,this.intervalMillis=t}getThrottleMetadata(e){return this.throttleMetadata[e]}setThrottleMetadata(e,t){this.throttleMetadata[e]=t}deleteThrottleMetadata(e){delete this.throttleMetadata[e]}}const ZI=new XD;function ZD(n){return new Headers({Accept:"application/json","x-goog-api-key":n})}async function eN(n){var e;const{appId:t,apiKey:r}=n,i={method:"GET",headers:ZD(r)},s=UD.replace("{app-id}",t),o=await fetch(s,i);if(o.status!==200&&o.status!==304){let c="";try{const u=await o.json();!((e=u.error)===null||e===void 0)&&e.message&&(c=u.error.message)}catch{}throw ut.create("config-fetch-failed",{httpStatus:o.status,responseMessage:c})}return o.json()}async function tN(n,e=ZI,t){const{appId:r,apiKey:i,measurementId:s}=n.options;if(!r)throw ut.create("no-app-id");if(!i){if(s)return{measurementId:s,appId:r};throw ut.create("no-api-key")}const o=e.getThrottleMetadata(r)||{backoffCount:0,throttleEndTimeMillis:Date.now()},c=new iN;return setTimeout(async()=>{c.abort()},FD),eT({appId:r,apiKey:i,measurementId:s},o,c,e)}async function eT(n,{throttleEndTimeMillis:e,backoffCount:t},r,i=ZI){var s;const{appId:o,measurementId:c}=n;try{await nN(r,e)}catch(u){if(c)return it.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${c} provided in the "measurementId" field in the local Firebase config. [${u==null?void 0:u.message}]`),{appId:o,measurementId:c};throw u}try{const u=await eN(n);return i.deleteThrottleMetadata(o),u}catch(u){const l=u;if(!rN(l)){if(i.deleteThrottleMetadata(o),c)return it.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${c} provided in the "measurementId" field in the local Firebase config. [${l==null?void 0:l.message}]`),{appId:o,measurementId:c};throw u}const d=Number((s=l==null?void 0:l.customData)===null||s===void 0?void 0:s.httpStatus)===503?Md(t,i.intervalMillis,YD):Md(t,i.intervalMillis),p={throttleEndTimeMillis:Date.now()+d,backoffCount:t+1};return i.setThrottleMetadata(o,p),it.debug(`Calling attemptFetch again in ${d} millis`),eT(n,p,r,i)}}function nN(n,e){return new Promise((t,r)=>{const i=Math.max(e-Date.now(),0),s=setTimeout(t,i);n.addEventListener(()=>{clearTimeout(s),r(ut.create("fetch-throttle",{throttleEndTimeMillis:e}))})})}function rN(n){if(!(n instanceof mt)||!n.customData)return!1;const e=Number(n.customData.httpStatus);return e===429||e===500||e===503||e===504}class iN{constructor(){this.listeners=[]}addEventListener(e){this.listeners.push(e)}abort(){this.listeners.forEach(e=>e())}}async function sN(n,e,t,r,i){if(i&&i.global){n("event",t,r);return}else{const s=await e,o=Object.assign(Object.assign({},r),{send_to:s});n("event",t,o)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function oN(){if(Ra())try{await Qu()}catch(n){return it.warn(ut.create("indexeddb-unavailable",{errorInfo:n==null?void 0:n.toString()}).message),!1}else return it.warn(ut.create("indexeddb-unavailable",{errorInfo:"IndexedDB is not available in this environment."}).message),!1;return!0}async function aN(n,e,t,r,i,s,o){var c;const u=tN(n);u.then(T=>{t[T.measurementId]=T.appId,n.options.measurementId&&T.measurementId!==n.options.measurementId&&it.warn(`The measurement ID in the local Firebase config (${n.options.measurementId}) does not match the measurement ID fetched from the server (${T.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)}).catch(T=>it.error(T)),e.push(u);const l=oN().then(T=>{if(T)return r.getId()}),[d,p]=await Promise.all([u,l]);QD(s)||$D(s,d.measurementId),i("js",new Date);const m=(c=o==null?void 0:o.config)!==null&&c!==void 0?c:{};return m[MD]="firebase",m.update=!0,p!=null&&(m[LD]=p),i("config",d.measurementId,m),d.measurementId}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cN{constructor(e){this.app=e}_delete(){return delete vs[this.app.options.appId],Promise.resolve()}}let vs={},Kp=[];const Wp={};let cu="dataLayer",uN="gtag",Hp,tT,Qp=!1;function lN(){const n=[];if(Hu()&&n.push("This is a browser extension environment."),lm()||n.push("Cookies are not available."),n.length>0){const e=n.map((r,i)=>`(${i+1}) ${r}`).join(" "),t=ut.create("invalid-analytics-context",{errorInfo:e});it.warn(t.message)}}function hN(n,e,t){lN();const r=n.options.appId;if(!r)throw ut.create("no-app-id");if(!n.options.apiKey)if(n.options.measurementId)it.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${n.options.measurementId} provided in the "measurementId" field in the local Firebase config.`);else throw ut.create("no-api-key");if(vs[r]!=null)throw ut.create("already-exists",{id:r});if(!Qp){zD(cu);const{wrappedGtag:s,gtagCore:o}=HD(vs,Kp,Wp,cu,uN);tT=s,Hp=o,Qp=!0}return vs[r]=aN(n,Kp,Wp,e,Hp,cu,t),new cN(n)}function vN(n=Pa()){n=j(n);const e=Nt(n,wa);return e.isInitialized()?e.getImmediate():dN(n)}function dN(n,e={}){const t=Nt(n,wa);if(t.isInitialized()){const i=t.getImmediate();if(dt(e,t.getOptions()))return i;throw ut.create("already-initialized")}return t.initialize({options:e})}async function wN(){if(Hu()||!lm()||!Ra())return!1;try{return await Qu()}catch{return!1}}function fN(n,e,t,r){n=j(n),sN(tT,vs[n.app.options.appId],e,t,r).catch(i=>it.error(i))}const Yp="@firebase/analytics",Jp="0.10.17";function pN(){Et(new ft(wa,(e,{options:t})=>{const r=e.getProvider("app").getImmediate(),i=e.getProvider("installations-internal").getImmediate();return hN(r,i,t)},"PUBLIC")),Et(new ft("analytics-internal",n,"PRIVATE")),tt(Yp,Jp),tt(Yp,Jp,"esm2017");function n(e){try{const t=e.getProvider(wa).getImmediate();return{logEvent:(r,i,s)=>fN(t,r,i,s)}}catch(t){throw ut.create("interop-component-reg-failed",{reason:t})}}}pN();export{ZC as A,qw as B,N0 as C,FC as D,h0 as E,hI as F,Mt as G,GC as H,jC as I,b0 as J,k0 as K,P0 as L,C0 as M,TN as N,yN as O,IN as P,hA as Q,Hw as R,Xw as S,mN as T,_N as U,IC as a,EN as b,wN as c,vN as d,t0 as e,Ky as f,Hb as g,zu as h,ov as i,mC as j,n0 as k,S0 as l,y0 as m,a0 as n,cA as o,UC as p,OC as q,hb as r,s0 as s,c0 as t,o0 as u,XA as v,xC as w,Bw as x,Yw as y,Ww as z};
