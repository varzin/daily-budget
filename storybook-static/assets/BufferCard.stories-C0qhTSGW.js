import{B as t,J as M}from"./iframe-OnfYtxzL.js";import{u as n,C as L}from"./budgetStore-qW_yxr8e.js";import{u as k}from"./useMoney-BWK1WAFG.js";import{T as h}from"./TextField-84h9Kt7c.js";import"./preload-helper-C1FmrZbK.js";import"./index-D4XFbhrQ.js";import"./index-BFn9tSzK.js";import"./middleware-BoNmX9tp.js";import"./utils-CDWAskfl.js";const D="_card_15ug9_2",T="_lead_15ug9_9",A="_selectField_15ug9_17",z="_selectLabel_15ug9_23",J="_select_15ug9_17",O="_income_15ug9_48",W="_note_15ug9_51",o={card:D,lead:T,selectField:A,selectLabel:z,select:J,income:O,note:W};function F(){const i=n(e=>e.buffer),p=n(e=>e.currency),l=n(e=>e.monthlyIncome),r=k(),u=e=>{const s=e.target.value;n.getState().setBuffer(s===""?0:parseFloat(s)||0)},w=e=>{n.getState().setCurrency(e.target.value)},R=e=>{const s=e.target.value;n.getState().setMonthlyIncome(s===""?0:parseFloat(s)||0)};return t.jsxs("div",{className:o.card,children:[t.jsx("p",{className:o.lead,children:"The currency shown across the app, and your cushion — the balance you want left over by your next income day. The green daily budget keeps the cushion untouched on top of savings; set it to 0 for a plain break-even target."}),t.jsxs("label",{className:o.selectField,children:[t.jsx("span",{className:o.selectLabel,children:"Currency"}),t.jsx("select",{className:o.select,value:p,onChange:w,children:L.map(e=>t.jsxs("option",{value:e.code,children:[e.symbol," · ",e.name," (",e.code,")"]},e.code))})]}),t.jsx(h,{label:"Desired balance by month end",type:"number",inputMode:"decimal",step:"0.01",min:0,placeholder:"0",prefix:r.symbol,value:i||"",onChange:u}),t.jsxs("div",{className:o.income,children:[t.jsx(h,{label:"Monthly income (optional)",type:"number",inputMode:"decimal",step:"0.01",min:0,placeholder:"Not set",prefix:r.symbol,value:l||"",onChange:R}),t.jsx("p",{className:o.note,children:"Used only for the spending-pace indicator on the dashboard — it compares your actual daily budget with the planned one. Your daily budget itself never depends on it. Leave empty to hide the indicator."})]})]})}F.__docgenInfo={description:`Budget settings: the currency used across the app, the green-zone cushion
(the desired balance to keep by month end) and the optional monthly income
feeding the dashboard pace indicator. All are synced scalars — see
budgetStore.setCurrency / setBuffer / setMonthlyIncome and the per-field
meta timestamps.`,methods:[],displayName:"BufferCard"};const Z={title:"Settings/BufferCard",component:F,parameters:{layout:"padded",docs:{description:{component:`Settings → Budget. Currency picker + the cushion (desired month-end balance)
+ optional monthly income for the pace indicator. All are synced scalars on
the budgetStore; the stories seed values and restore them on unmount.`}}}};function m(i){return function(l){return M.useEffect(()=>{const r=n.getState(),u={currency:r.currency,buffer:r.buffer,monthlyIncome:r.monthlyIncome};return n.setState(i),()=>n.setState(u)},[]),t.jsx("div",{style:{maxWidth:420},children:t.jsx(l,{})})}}const a={decorators:[m({currency:"EUR",buffer:500,monthlyIncome:3200})]},c={decorators:[m({currency:"EUR",buffer:0,monthlyIncome:0})]},d={decorators:[m({currency:"USD",buffer:800,monthlyIncome:0})]};var y,f,g,b,_;a.parameters={...a.parameters,docs:{...(y=a.parameters)==null?void 0:y.docs,source:{originalSource:`{
  decorators: [withScalars({
    currency: 'EUR',
    buffer: 500,
    monthlyIncome: 3200
  })]
}`,...(g=(f=a.parameters)==null?void 0:f.docs)==null?void 0:g.source},description:{story:"Cushion and income both set (EUR).",...(_=(b=a.parameters)==null?void 0:b.docs)==null?void 0:_.description}}};var x,S,C,v,I;c.parameters={...c.parameters,docs:{...(x=c.parameters)==null?void 0:x.docs,source:{originalSource:`{
  decorators: [withScalars({
    currency: 'EUR',
    buffer: 0,
    monthlyIncome: 0
  })]
}`,...(C=(S=c.parameters)==null?void 0:S.docs)==null?void 0:C.source},description:{story:"Defaults — empty cushion and no income (indicator hidden in the app).",...(I=(v=c.parameters)==null?void 0:v.docs)==null?void 0:I.description}}};var j,E,U,B,N;d.parameters={...d.parameters,docs:{...(j=d.parameters)==null?void 0:j.docs,source:{originalSource:`{
  decorators: [withScalars({
    currency: 'USD',
    buffer: 800,
    monthlyIncome: 0
  })]
}`,...(U=(E=d.parameters)==null?void 0:E.docs)==null?void 0:U.source},description:{story:"A non-euro currency to show the symbol propagating to the prefixes.",...(N=(B=d.parameters)==null?void 0:B.docs)==null?void 0:N.description}}};const $=["Filled","Empty","UsdCurrency"];export{c as Empty,a as Filled,d as UsdCurrency,$ as __namedExportsOrder,Z as default};
