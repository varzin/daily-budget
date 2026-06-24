import{c as s}from"./createLucideIcon-DsPN7Mr_.js";import{J as y,B as r}from"./iframe-OnfYtxzL.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=[["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2",key:"48i651"}],["line",{x1:"8",x2:"16",y1:"21",y2:"21",key:"1svkeh"}],["line",{x1:"12",x2:"12",y1:"17",y2:"21",key:"vw1qmm"}]],M=s("monitor",g);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]],I=s("moon",v);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]],N=s("sun",f),k="_group_18a72_4",x="_thumb_18a72_2",_="_option_18a72_32",w="_active_18a72_54",b="_icon_18a72_62",o={group:k,thumb:x,option:_,active:w,icon:b};function A({value:c,onChange:l,options:n,ariaLabel:u}){const d=y.useRef([]),i=Math.max(0,n.findIndex(e=>e.value===c)),m=e=>{var a;const t=n[e];t&&((a=d.current[e])==null||a.focus(),l(t.value))},p=e=>{let t=null;e.key==="ArrowRight"||e.key==="ArrowDown"?t=(i+1)%n.length:e.key==="ArrowLeft"||e.key==="ArrowUp"?t=(i-1+n.length)%n.length:e.key==="Home"?t=0:e.key==="End"&&(t=n.length-1),t!==null&&(e.preventDefault(),m(t))};return r.jsxs("div",{className:o.group,role:"radiogroup","aria-label":u,onKeyDown:p,style:{"--seg-count":n.length},children:[r.jsx("span",{className:o.thumb,"aria-hidden":"true",style:{transform:`translateX(${i*100}%)`}}),n.map((e,t)=>{const a=e.value===c;return r.jsxs("button",{ref:h=>{d.current[t]=h},type:"button",role:"radio","aria-checked":a,tabIndex:a?0:-1,className:[o.option,a?o.active:""].filter(Boolean).join(" "),onClick:()=>l(e.value),children:[e.icon&&r.jsx("span",{className:o.icon,"aria-hidden":"true",children:e.icon}),r.jsx("span",{children:e.label})]},e.value)})]})}A.__docgenInfo={description:`A segmented control: a row of mutually-exclusive options with a sliding
highlight. Implemented as a WAI-ARIA radiogroup with roving tabindex and
arrow-key navigation. Generic over the value type so callers stay type-safe.`,methods:[],displayName:"Segmented",props:{value:{required:!0,tsType:{name:"T"},description:""},onChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(value: T) => void",signature:{arguments:[{type:{name:"T"},name:"value"}],return:{name:"void"}}},description:""},options:{required:!0,tsType:{name:"Array",elements:[{name:"SegmentedOption",elements:[{name:"T"}],raw:"SegmentedOption<T>"}],raw:"SegmentedOption<T>[]"},description:""},ariaLabel:{required:!1,tsType:{name:"string"},description:"Accessible label for the group (it renders as a radiogroup)."}}};export{M,A as S,I as a,N as b};
