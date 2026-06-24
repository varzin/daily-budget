var x=Object.defineProperty;var _=(n,r,e)=>r in n?x(n,r,{enumerable:!0,configurable:!0,writable:!0,value:e}):n[r]=e;var c=(n,r,e)=>_(n,typeof r!="symbol"?r+"":r,e);import{J as f,B as o}from"./iframe-OnfYtxzL.js";import"./preload-helper-C1FmrZbK.js";const E="_wrap_132de_1",B="_title_132de_14",j="_body_132de_20",k="_btn_132de_26",s={wrap:E,title:B,body:j,btn:k};class d extends f.Component{constructor(){super(...arguments);c(this,"state",{error:null})}static getDerivedStateFromError(e){return{error:e}}componentDidCatch(e){console.error("Unhandled render error:",e)}render(){return this.state.error?o.jsxs("div",{className:s.wrap,role:"alert",children:[o.jsx("h1",{className:s.title,children:"Something went wrong"}),o.jsx("p",{className:s.body,children:"Your data is safe — it's stored in this browser (and in Dropbox if sync is connected). Reload the app to continue."}),o.jsx("button",{type:"button",className:s.btn,onClick:()=>window.location.reload(),children:"Reload app"})]}):this.props.children}}d.__docgenInfo={description:`Last-resort guard: an unexpected render error shows a recoverable screen
instead of a blank page. Data is untouched — it lives in localStorage (and
Dropbox when connected), so a reload is always safe.`,methods:[],displayName:"ErrorBoundary",props:{children:{required:!0,tsType:{name:"ReactNode"},description:""}}};const C={title:"App/ErrorBoundary",component:d,parameters:{layout:"fullscreen",docs:{description:{component:`Last-resort guard around the app. When a child throws during render it shows
a recoverable fallback ("Something went wrong" + Reload) instead of a blank
page. The fallback story renders a child that throws on mount.

Note: React logs the caught error to the console — that is expected here.`}}}};function v(){throw new Error("Simulated render error")}const t={render:()=>o.jsx(d,{children:o.jsx(v,{})})},a={render:()=>o.jsx(d,{children:o.jsx("div",{style:{padding:40},children:"Children render normally when there's no error."})})};var i,l,p,h,u;t.parameters={...t.parameters,docs:{...(i=t.parameters)==null?void 0:i.docs,source:{originalSource:`{
  render: () => <ErrorBoundary>
      <Boom />
    </ErrorBoundary>
}`,...(p=(l=t.parameters)==null?void 0:l.docs)==null?void 0:p.source},description:{story:"The fallback UI shown after a child throws.",...(u=(h=t.parameters)==null?void 0:h.docs)==null?void 0:u.description}}};var m,y,w,b,g;a.parameters={...a.parameters,docs:{...(m=a.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: () => <ErrorBoundary>
      <div style={{
      padding: 40
    }}>Children render normally when there's no error.</div>
    </ErrorBoundary>
}`,...(w=(y=a.parameters)==null?void 0:y.docs)==null?void 0:w.source},description:{story:"Normal pass-through: children render when nothing throws.",...(g=(b=a.parameters)==null?void 0:b.docs)==null?void 0:g.description}}};const D=["Fallback","HappyPath"];export{t as Fallback,a as HappyPath,D as __namedExportsOrder,C as default};
