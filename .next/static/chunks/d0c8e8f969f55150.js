(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,84854,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"warnOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},40359,e=>{"use strict";let t,r;var n,o=e.i(26104);let a={data:""},i=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,s=/\/\*[^]*?\*\/|  +/g,l=/\n+/g,u=(e,t)=>{let r="",n="",o="";for(let a in e){let i=e[a];"@"==a[0]?"i"==a[1]?r=a+" "+i+";":n+="f"==a[1]?u(i,a):a+"{"+u(i,"k"==a[1]?"":t)+"}":"object"==typeof i?n+=u(i,t?t.replace(/([^,])+/g,e=>a.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,t=>/&/.test(t)?t.replace(/&/g,e):e?e+" "+t:t)):a):null!=i&&(a=/^--/.test(a)?a:a.replace(/[A-Z]/g,"-$&").toLowerCase(),o+=u.p?u.p(a,i):a+":"+i+";")}return r+(t&&o?t+"{"+o+"}":o)+n},c={},d=e=>{if("object"==typeof e){let t="";for(let r in e)t+=r+d(e[r]);return t}return e};function f(e){let t,r,n=this||{},o=e.call?e(n.p):e;return((e,t,r,n,o)=>{var a;let f=d(e),p=c[f]||(c[f]=(e=>{let t=0,r=11;for(;t<e.length;)r=101*r+e.charCodeAt(t++)>>>0;return"go"+r})(f));if(!c[p]){let t=f!==e?e:(e=>{let t,r,n=[{}];for(;t=i.exec(e.replace(s,""));)t[4]?n.shift():t[3]?(r=t[3].replace(l," ").trim(),n.unshift(n[0][r]=n[0][r]||{})):n[0][t[1]]=t[2].replace(l," ").trim();return n[0]})(e);c[p]=u(o?{["@keyframes "+p]:t}:t,r?"":"."+p)}let m=r&&c.g?c.g:null;return r&&(c.g=c[p]),a=c[p],m?t.data=t.data.replace(m,a):-1===t.data.indexOf(a)&&(t.data=n?a+t.data:t.data+a),p})(o.unshift?o.raw?(t=[].slice.call(arguments,1),r=n.p,o.reduce((e,n,o)=>{let a=t[o];if(a&&a.call){let e=a(r),t=e&&e.props&&e.props.className||/^go/.test(e)&&e;a=t?"."+t:e&&"object"==typeof e?e.props?"":u(e,""):!1===e?"":e}return e+n+(null==a?"":a)},"")):o.reduce((e,t)=>Object.assign(e,t&&t.call?t(n.p):t),{}):o,(e=>{if("object"==typeof window){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||a})(n.target),n.g,n.o,n.k)}f.bind({g:1});let p,m,h,g=f.bind({k:1});function y(e,t){let r=this||{};return function(){let n=arguments;function o(a,i){let s=Object.assign({},a),l=s.className||o.className;r.p=Object.assign({theme:m&&m()},s),r.o=/ *go\d+/.test(l),s.className=f.apply(r,n)+(l?" "+l:""),t&&(s.ref=i);let u=e;return e[0]&&(u=s.as||e,delete s.as),h&&u[0]&&h(s),p(u,s)}return t?t(o):o}}var b=(e,t)=>"function"==typeof e?e(t):e,v=(t=0,()=>(++t).toString()),x=()=>{if(void 0===r&&"u">typeof window){let e=matchMedia("(prefers-reduced-motion: reduce)");r=!e||e.matches}return r},j="default",w=(e,t)=>{let{toastLimit:r}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,r)};case 1:return{...e,toasts:e.toasts.map(e=>e.id===t.toast.id?{...e,...t.toast}:e)};case 2:let{toast:n}=t;return w(e,{type:+!!e.toasts.find(e=>e.id===n.id),toast:n});case 3:let{toastId:o}=t;return{...e,toasts:e.toasts.map(e=>e.id===o||void 0===o?{...e,dismissed:!0,visible:!1}:e)};case 4:return void 0===t.toastId?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(e=>e.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let a=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(e=>({...e,pauseDuration:e.pauseDuration+a}))}}},k=[],E={toasts:[],pausedAt:void 0,settings:{toastLimit:20}},P={},O=(e,t=j)=>{P[t]=w(P[t]||E,e),k.forEach(([e,r])=>{e===t&&r(P[t])})},C=e=>Object.keys(P).forEach(t=>O(e,t)),N=(e=j)=>t=>{O(t,e)},_={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},L=e=>(t,r)=>{let n,o=((e,t="blank",r)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...r,id:(null==r?void 0:r.id)||v()}))(t,e,r);return N(o.toasterId||(n=o.id,Object.keys(P).find(e=>P[e].toasts.some(e=>e.id===n))))({type:2,toast:o}),o.id},S=(e,t)=>L("blank")(e,t);S.error=L("error"),S.success=L("success"),S.loading=L("loading"),S.custom=L("custom"),S.dismiss=(e,t)=>{let r={type:3,toastId:e};t?N(t)(r):C(r)},S.dismissAll=e=>S.dismiss(void 0,e),S.remove=(e,t)=>{let r={type:4,toastId:e};t?N(t)(r):C(r)},S.removeAll=e=>S.remove(void 0,e),S.promise=(e,t,r)=>{let n=S.loading(t.loading,{...r,...null==r?void 0:r.loading});return"function"==typeof e&&(e=e()),e.then(e=>{let o=t.success?b(t.success,e):void 0;return o?S.success(o,{id:n,...r,...null==r?void 0:r.success}):S.dismiss(n),e}).catch(e=>{let o=t.error?b(t.error,e):void 0;o?S.error(o,{id:n,...r,...null==r?void 0:r.error}):S.dismiss(n)}),e};var $=1e3,T=g`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,M=g`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,A=g`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,I=y("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${T} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${M} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${A} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,R=g`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,D=y("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${R} 1s linear infinite;
`,U=g`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,z=g`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,F=y("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${U} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${z} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,B=y("div")`
  position: absolute;
`,W=y("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,H=g`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,K=y("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${H} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,V=({toast:e})=>{let{icon:t,type:r,iconTheme:n}=e;return void 0!==t?"string"==typeof t?o.createElement(K,null,t):t:"blank"===r?null:o.createElement(W,null,o.createElement(D,{...n}),"loading"!==r&&o.createElement(B,null,"error"===r?o.createElement(I,{...n}):o.createElement(F,{...n})))},J=y("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,q=y("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Q=o.memo(({toast:e,position:t,style:r,children:n})=>{let a=e.height?((e,t)=>{let r=e.includes("top")?1:-1,[n,o]=x()?["0%{opacity:0;} 100%{opacity:1;}","0%{opacity:1;} 100%{opacity:0;}"]:[`
0% {transform: translate3d(0,${-200*r}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${-150*r}%,-1px) scale(.6); opacity:0;}
`];return{animation:t?`${g(n)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${g(o)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}})(e.position||t||"top-center",e.visible):{opacity:0},i=o.createElement(V,{toast:e}),s=o.createElement(q,{...e.ariaProps},b(e.message,e));return o.createElement(J,{className:e.className,style:{...a,...r,...e.style}},"function"==typeof n?n({icon:i,message:s}):o.createElement(o.Fragment,null,i,s))});n=o.createElement,u.p=void 0,p=n,m=void 0,h=void 0;var X=({id:e,className:t,style:r,onHeightUpdate:n,children:a})=>{let i=o.useCallback(t=>{if(t){let r=()=>{n(e,t.getBoundingClientRect().height)};r(),new MutationObserver(r).observe(t,{subtree:!0,childList:!0,characterData:!0})}},[e,n]);return o.createElement("div",{ref:i,className:t,style:r},a)},Z=f`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,G=({reverseOrder:e,position:t="top-center",toastOptions:r,gutter:n,children:a,toasterId:i,containerStyle:s,containerClassName:l})=>{let{toasts:u,handlers:c}=((e,t="default")=>{let{toasts:r,pausedAt:n}=((e={},t=j)=>{let[r,n]=(0,o.useState)(P[t]||E),a=(0,o.useRef)(P[t]);(0,o.useEffect)(()=>(a.current!==P[t]&&n(P[t]),k.push([t,n]),()=>{let e=k.findIndex(([e])=>e===t);e>-1&&k.splice(e,1)}),[t]);let i=r.toasts.map(t=>{var r,n,o;return{...e,...e[t.type],...t,removeDelay:t.removeDelay||(null==(r=e[t.type])?void 0:r.removeDelay)||(null==e?void 0:e.removeDelay),duration:t.duration||(null==(n=e[t.type])?void 0:n.duration)||(null==e?void 0:e.duration)||_[t.type],style:{...e.style,...null==(o=e[t.type])?void 0:o.style,...t.style}}});return{...r,toasts:i}})(e,t),a=(0,o.useRef)(new Map).current,i=(0,o.useCallback)((e,t=$)=>{if(a.has(e))return;let r=setTimeout(()=>{a.delete(e),s({type:4,toastId:e})},t);a.set(e,r)},[]);(0,o.useEffect)(()=>{if(n)return;let e=Date.now(),o=r.map(r=>{if(r.duration===1/0)return;let n=(r.duration||0)+r.pauseDuration-(e-r.createdAt);if(n<0){r.visible&&S.dismiss(r.id);return}return setTimeout(()=>S.dismiss(r.id,t),n)});return()=>{o.forEach(e=>e&&clearTimeout(e))}},[r,n,t]);let s=(0,o.useCallback)(N(t),[t]),l=(0,o.useCallback)(()=>{s({type:5,time:Date.now()})},[s]),u=(0,o.useCallback)((e,t)=>{s({type:1,toast:{id:e,height:t}})},[s]),c=(0,o.useCallback)(()=>{n&&s({type:6,time:Date.now()})},[n,s]),d=(0,o.useCallback)((e,t)=>{let{reverseOrder:n=!1,gutter:o=8,defaultPosition:a}=t||{},i=r.filter(t=>(t.position||a)===(e.position||a)&&t.height),s=i.findIndex(t=>t.id===e.id),l=i.filter((e,t)=>t<s&&e.visible).length;return i.filter(e=>e.visible).slice(...n?[l+1]:[0,l]).reduce((e,t)=>e+(t.height||0)+o,0)},[r]);return(0,o.useEffect)(()=>{r.forEach(e=>{if(e.dismissed)i(e.id,e.removeDelay);else{let t=a.get(e.id);t&&(clearTimeout(t),a.delete(e.id))}})},[r,i]),{toasts:r,handlers:{updateHeight:u,startPause:l,endPause:c,calculateOffset:d}}})(r,i);return o.createElement("div",{"data-rht-toaster":i||"",style:{position:"fixed",zIndex:9999,top:16,left:16,right:16,bottom:16,pointerEvents:"none",...s},className:l,onMouseEnter:c.startPause,onMouseLeave:c.endPause},u.map(r=>{let i,s,l=r.position||t,u=c.calculateOffset(r,{reverseOrder:e,gutter:n,defaultPosition:t}),d=(i=l.includes("top"),s=l.includes("center")?{justifyContent:"center"}:l.includes("right")?{justifyContent:"flex-end"}:{},{left:0,right:0,display:"flex",position:"absolute",transition:x()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${u*(i?1:-1)}px)`,...i?{top:0}:{bottom:0},...s});return o.createElement(X,{id:r.id,key:r.id,onHeightUpdate:c.updateHeight,className:r.visible?Z:"",style:d},"custom"===r.type?b(r.message,r):a?a(r):o.createElement(Q,{toast:r,position:l}))}))};e.s(["Toaster",()=>G,"default",()=>S],40359)},28468,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={assign:function(){return l},searchParamsToUrlQuery:function(){return a},urlQueryToSearchParams:function(){return s}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});function a(e){let t={};for(let[r,n]of e.entries()){let e=t[r];void 0===e?t[r]=n:Array.isArray(e)?e.push(n):t[r]=[e,n]}return t}function i(e){return"string"==typeof e?e:("number"!=typeof e||isNaN(e))&&"boolean"!=typeof e?"":String(e)}function s(e){let t=new URLSearchParams;for(let[r,n]of Object.entries(e))if(Array.isArray(n))for(let e of n)t.append(r,i(e));else t.set(r,i(n));return t}function l(e,...t){for(let r of t){for(let t of r.keys())e.delete(t);for(let[t,n]of r.entries())e.append(t,n)}return e}},68056,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={formatUrl:function(){return s},formatWithValidation:function(){return u},urlObjectKeys:function(){return l}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=e.r(34264)._(e.r(28468)),i=/https?|ftp|gopher|file/;function s(e){let{auth:t,hostname:r}=e,n=e.protocol||"",o=e.pathname||"",s=e.hash||"",l=e.query||"",u=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?u=t+e.host:r&&(u=t+(~r.indexOf(":")?`[${r}]`:r),e.port&&(u+=":"+e.port)),l&&"object"==typeof l&&(l=String(a.urlQueryToSearchParams(l)));let c=e.search||l&&`?${l}`||"";return n&&!n.endsWith(":")&&(n+=":"),e.slashes||(!n||i.test(n))&&!1!==u?(u="//"+(u||""),o&&"/"!==o[0]&&(o="/"+o)):u||(u=""),s&&"#"!==s[0]&&(s="#"+s),c&&"?"!==c[0]&&(c="?"+c),o=o.replace(/[?#]/g,encodeURIComponent),c=c.replace("#","%23"),`${n}${u}${o}${c}${s}`}let l=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function u(e){return s(e)}},66832,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useMergedRef",{enumerable:!0,get:function(){return o}});let n=e.r(26104);function o(e,t){let r=(0,n.useRef)(null),o=(0,n.useRef)(null);return(0,n.useCallback)(n=>{if(null===n){let e=r.current;e&&(r.current=null,e());let t=o.current;t&&(o.current=null,t())}else e&&(r.current=a(e,n)),t&&(o.current=a(t,n))},[e,t])}function a(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let r=e(t);return"function"==typeof r?r:()=>e(null)}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},1507,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={DecodeError:function(){return y},MiddlewareNotFoundError:function(){return j},MissingStaticPage:function(){return x},NormalizeError:function(){return b},PageNotFoundError:function(){return v},SP:function(){return h},ST:function(){return g},WEB_VITALS:function(){return a},execOnce:function(){return i},getDisplayName:function(){return d},getLocationOrigin:function(){return u},getURL:function(){return c},isAbsoluteUrl:function(){return l},isResSent:function(){return f},loadGetInitialProps:function(){return m},normalizeRepeatedSlashes:function(){return p},stringifyError:function(){return w}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=["CLS","FCP","FID","INP","LCP","TTFB"];function i(e){let t,r=!1;return(...n)=>(r||(r=!0,t=e(...n)),t)}let s=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,l=e=>s.test(e);function u(){let{protocol:e,hostname:t,port:r}=window.location;return`${e}//${t}${r?":"+r:""}`}function c(){let{href:e}=window.location,t=u();return e.substring(t.length)}function d(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function f(e){return e.finished||e.headersSent}function p(e){let t=e.split("?");return t[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(t[1]?`?${t.slice(1).join("?")}`:"")}async function m(e,t){let r=t.res||t.ctx&&t.ctx.res;if(!e.getInitialProps)return t.ctx&&t.Component?{pageProps:await m(t.Component,t.ctx)}:{};let n=await e.getInitialProps(t);if(r&&f(r))return n;if(!n)throw Object.defineProperty(Error(`"${d(e)}.getInitialProps()" should resolve to an object. But found "${n}" instead.`),"__NEXT_ERROR_CODE",{value:"E394",enumerable:!1,configurable:!0});return n}let h="u">typeof performance,g=h&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class y extends Error{}class b extends Error{}class v extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message=`Cannot find module for page: ${e}`}}class x extends Error{constructor(e,t){super(),this.message=`Failed to load static file for page: ${e} ${t}`}}class j extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function w(e){return JSON.stringify({message:e.message,stack:e.stack})}},74769,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"isLocalURL",{enumerable:!0,get:function(){return a}});let n=e.r(1507),o=e.r(15316);function a(e){if(!(0,n.isAbsoluteUrl)(e))return!0;try{let t=(0,n.getLocationOrigin)(),r=new URL(e,t);return r.origin===t&&(0,o.hasBasePath)(r.pathname)}catch(e){return!1}}},44997,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"errorOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},87787,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={default:function(){return y},useLinkStatus:function(){return v}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=e.r(34264),i=e.r(2070),s=a._(e.r(26104)),l=e.r(68056),u=e.r(2068),c=e.r(66832),d=e.r(1507),f=e.r(95490);e.r(84854);let p=e.r(73743),m=e.r(74769),h=e.r(81285);function g(e){return"string"==typeof e?e:(0,l.formatUrl)(e)}function y(t){var r;let n,o,a,[l,y]=(0,s.useOptimistic)(p.IDLE_LINK_STATUS),v=(0,s.useRef)(null),{href:x,as:j,children:w,prefetch:k=null,passHref:E,replace:P,shallow:O,scroll:C,onClick:N,onMouseEnter:_,onTouchStart:L,legacyBehavior:S=!1,onNavigate:$,ref:T,unstable_dynamicOnHover:M,...A}=t;n=w,S&&("string"==typeof n||"number"==typeof n)&&(n=(0,i.jsx)("a",{children:n}));let I=s.default.useContext(u.AppRouterContext),R=!1!==k,D=!1!==k?null===(r=k)||"auto"===r?h.FetchStrategy.PPR:h.FetchStrategy.Full:h.FetchStrategy.PPR,{href:U,as:z}=s.default.useMemo(()=>{let e=g(x);return{href:e,as:j?g(j):e}},[x,j]);if(S){if(n?.$$typeof===Symbol.for("react.lazy"))throw Object.defineProperty(Error("`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag."),"__NEXT_ERROR_CODE",{value:"E863",enumerable:!1,configurable:!0});o=s.default.Children.only(n)}let F=S?o&&"object"==typeof o&&o.ref:T,B=s.default.useCallback(e=>(null!==I&&(v.current=(0,p.mountLinkInstance)(e,U,I,D,R,y)),()=>{v.current&&((0,p.unmountLinkForCurrentNavigation)(v.current),v.current=null),(0,p.unmountPrefetchableInstance)(e)}),[R,U,I,D,y]),W={ref:(0,c.useMergedRef)(B,F),onClick(t){S||"function"!=typeof N||N(t),S&&o.props&&"function"==typeof o.props.onClick&&o.props.onClick(t),!I||t.defaultPrevented||function(t,r,n,o,a,i,l){if("u">typeof window){let u,{nodeName:c}=t.currentTarget;if("A"===c.toUpperCase()&&((u=t.currentTarget.getAttribute("target"))&&"_self"!==u||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||t.nativeEvent&&2===t.nativeEvent.which)||t.currentTarget.hasAttribute("download"))return;if(!(0,m.isLocalURL)(r)){a&&(t.preventDefault(),location.replace(r));return}if(t.preventDefault(),l){let e=!1;if(l({preventDefault:()=>{e=!0}}),e)return}let{dispatchNavigateAction:d}=e.r(93098);s.default.startTransition(()=>{d(n||r,a?"replace":"push",i??!0,o.current)})}}(t,U,z,v,P,C,$)},onMouseEnter(e){S||"function"!=typeof _||_(e),S&&o.props&&"function"==typeof o.props.onMouseEnter&&o.props.onMouseEnter(e),I&&R&&(0,p.onNavigationIntent)(e.currentTarget,!0===M)},onTouchStart:function(e){S||"function"!=typeof L||L(e),S&&o.props&&"function"==typeof o.props.onTouchStart&&o.props.onTouchStart(e),I&&R&&(0,p.onNavigationIntent)(e.currentTarget,!0===M)}};return(0,d.isAbsoluteUrl)(z)?W.href=z:S&&!E&&("a"!==o.type||"href"in o.props)||(W.href=(0,f.addBasePath)(z)),a=S?s.default.cloneElement(o,W):(0,i.jsx)("a",{...A,...W,children:n}),(0,i.jsx)(b.Provider,{value:l,children:a})}e.r(44997);let b=(0,s.createContext)(p.IDLE_LINK_STATUS),v=()=>(0,s.useContext)(b);("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},17925,e=>{"use strict";let t="kui_user";function r(){try{let e=localStorage.getItem(t);return e?JSON.parse(e):null}catch{return null}}function n(e){localStorage.setItem(t,JSON.stringify(e))}function o(){localStorage.removeItem(t)}function a(){return null!==r()}e.s(["getUser",()=>r,"isLoggedIn",()=>a,"logout",()=>o,"setUser",()=>n])},55748,(e,t,r)=>{t.exports=e.r(10142)},46415,e=>{"use strict";var t=e.i(2070),r=e.i(26104),n=e.i(55748),o=e.i(17925),a=e.i(87787);let i=[{name:"Home",href:"/",icon:(0,t.jsx)("svg",{className:"w-6 h-6",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"})})},{name:"Prep",href:"/prep",icon:(0,t.jsx)("svg",{className:"w-6 h-6",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 6v6m0 0v6m0-6h6m-6 0H6"})})},{name:"Waste",href:"/waste",icon:(0,t.jsx)("svg",{className:"w-6 h-6",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"})})},{name:"Alerts",href:"/alerts",icon:(0,t.jsx)("svg",{className:"w-6 h-6",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"})})},{name:"Settings",href:"/settings",icon:(0,t.jsxs)("svg",{className:"w-6 h-6",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:[(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"}),(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M15 12a3 3 0 11-6 0 3 3 0 016 0z"})]})}];function s(){let e=(0,n.usePathname)();return(0,t.jsx)("nav",{className:"fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe",children:(0,t.jsx)("div",{className:"flex items-center justify-around h-16 max-w-lg mx-auto",children:i.map(r=>{let n=e===r.href;return(0,t.jsxs)(a.default,{href:r.href,className:`flex flex-col items-center justify-center w-full h-full min-w-[64px] py-2 px-3 transition-colors duration-200 active:bg-gray-100 ${n?"text-emerald-600":"text-gray-500 hover:text-gray-700"}`,children:[(0,t.jsx)("span",{className:n?"text-emerald-600":"text-gray-500",children:r.icon}),(0,t.jsx)("span",{className:`text-xs mt-1 font-medium ${n?"text-emerald-600":"text-gray-500"}`,children:r.name})]},r.name)})})})}var l=e.i(40359);let u=["/login"];function c({children:e}){let a=(0,n.useRouter)(),i=(0,n.usePathname)(),[c,d]=(0,r.useState)(!1),[f,p]=(0,r.useState)(!1),m=u.some(e=>i.startsWith(e));return((0,r.useEffect)(()=>{let e=(0,o.isLoggedIn)();p(e),d(!0),e||m?e&&"/login"===i&&a.replace("/"):a.replace("/login")},[i,m,a]),c)?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(l.Toaster,{position:"top-center",toastOptions:{duration:3e3,style:{borderRadius:"12px",fontWeight:500},success:{style:{background:"#10b981",color:"#fff"}},error:{style:{background:"#ef4444",color:"#fff"}}}}),(0,t.jsx)("main",{className:`min-h-screen ${(f||m)&&!m?"pb-20":""}`,children:e}),f&&!m&&(0,t.jsx)(s,{})]}):(0,t.jsx)("div",{className:"min-h-screen flex items-center justify-center bg-white",children:(0,t.jsx)("div",{className:"w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"})})}e.s(["default",()=>c],46415)}]);