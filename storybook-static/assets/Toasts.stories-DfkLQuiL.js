import{B as o,J as I}from"./iframe-OnfYtxzL.js";import{u as d,a as N,d as j,s as k}from"./toastStore-BXZzrZfL.js";import{X as E}from"./x-DpRaTgqC.js";import"./preload-helper-C1FmrZbK.js";import"./index-D4XFbhrQ.js";import"./index-BFn9tSzK.js";import"./utils-CDWAskfl.js";import"./createLucideIcon-DsPN7Mr_.js";const L="_viewport_7yef8_3",U="_toast_7yef8_17",D="_error_7yef8_30",O="_message_7yef8_33",G="_action_7yef8_44",J="_close_7yef8_65",s={viewport:L,toast:U,error:D,message:O,action:G,close:J};function l(){const r=d(e=>e.toasts);return r.length===0?null:o.jsx("div",{className:s.viewport,"aria-label":"Notifications",children:r.map(e=>o.jsxs("div",{role:"status",className:[s.toast,e.tone==="error"&&s.error].filter(Boolean).join(" "),children:[o.jsx("span",{className:s.message,children:e.message}),e.actionLabel&&e.onAction&&o.jsx("button",{type:"button",className:s.action,onClick:()=>N(e.id),children:e.actionLabel}),o.jsx("button",{type:"button",className:s.close,"aria-label":"Dismiss notification",onClick:()=>j(e.id),children:o.jsx(E,{size:15,strokeWidth:2,"aria-hidden":"true"})})]},e.id))})}l.__docgenInfo={description:'Toast viewport — fixed above the bottom nav, screen-reader friendly\n(`role="status"` announces each toast politely). Mounted once in App.',methods:[],displayName:"Toasts"};const F={title:"UI/Toast",component:l,parameters:{layout:"fullscreen",docs:{description:{component:"The toast viewport. It reads the real `toastStore`, so these stories seed it\nthrough the store's public API (`showToast`) on mount and clear it on\nunmount. A long `duration` keeps each toast visible while you inspect it\n(the app uses 6s / 9s auto-dismiss)."}}}},M=1e6;function i(r){return function(){return I.useEffect(()=>(d.setState({toasts:[]}),r.forEach(A=>k({duration:M,...A})),()=>d.setState({toasts:[]})),[]),o.jsx(l,{})}}const n={render:i([{message:"Import complete"}])},a={render:i([{message:"Import failed: unexpected end of JSON",tone:"error"}])},c={render:i([{message:"Deleted 2026-05",actionLabel:"Undo",onAction:()=>{}}])},t={render:i([{message:"Saved balance"},{message:"Deleted Groceries",actionLabel:"Undo",onAction:()=>{}},{message:"Sync error — will retry",tone:"error"}])};var m,p,u;n.parameters={...n.parameters,docs:{...(m=n.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: seed([{
    message: 'Import complete'
  }])
}`,...(u=(p=n.parameters)==null?void 0:p.docs)==null?void 0:u.source}}};var f,g,h;a.parameters={...a.parameters,docs:{...(f=a.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: seed([{
    message: 'Import failed: unexpected end of JSON',
    tone: 'error'
  }])
}`,...(h=(g=a.parameters)==null?void 0:g.docs)==null?void 0:h.source}}};var _,y,S;c.parameters={...c.parameters,docs:{...(_=c.parameters)==null?void 0:_.docs,source:{originalSource:`{
  render: seed([{
    message: 'Deleted 2026-05',
    actionLabel: 'Undo',
    onAction: () => {}
  }])
}`,...(S=(y=c.parameters)==null?void 0:y.docs)==null?void 0:S.source}}};var b,x,v,T,w;t.parameters={...t.parameters,docs:{...(b=t.parameters)==null?void 0:b.docs,source:{originalSource:`{
  render: seed([{
    message: 'Saved balance'
  }, {
    message: 'Deleted Groceries',
    actionLabel: 'Undo',
    onAction: () => {}
  }, {
    message: 'Sync error — will retry',
    tone: 'error'
  }])
}`,...(v=(x=t.parameters)==null?void 0:x.docs)==null?void 0:v.source},description:{story:"The stack caps at three (oldest dropped).",...(w=(T=t.parameters)==null?void 0:T.docs)==null?void 0:w.description}}};const H=["SingleInfo","ErrorTone","WithUndoAction","MultipleStacked"];export{a as ErrorTone,t as MultipleStacked,n as SingleInfo,c as WithUndoAction,H as __namedExportsOrder,F as default};
