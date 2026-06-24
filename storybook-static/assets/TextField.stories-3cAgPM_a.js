import{T as C}from"./TextField-84h9Kt7c.js";import"./iframe-OnfYtxzL.js";import"./preload-helper-C1FmrZbK.js";const U={title:"UI/TextField",component:C,args:{placeholder:"Type here…",fullWidth:!1,alignRight:!1,disabled:!1},argTypes:{label:{control:"text"},placeholder:{control:"text"},fullWidth:{control:"boolean"},alignRight:{control:"boolean"},disabled:{control:"boolean"},prefix:{control:!1},suffix:{control:!1}},parameters:{docs:{description:{component:"Labelled text input with optional prefix/suffix adornments (e.g. a currency\nsymbol). Forwards every native input attribute, so `disabled`,\n`aria-invalid`, `inputMode`, etc. all work."}}}},e={},a={args:{label:"Current balance",placeholder:"0"}},r={args:{label:"Amount",prefix:"€",placeholder:"0",inputMode:"decimal"}},l={args:{label:"Rate",suffix:"%",placeholder:"0"}},o={parameters:{layout:"padded"},args:{label:"Note",fullWidth:!0,placeholder:"Spans the container"}},t={args:{label:"Saved this month",prefix:"€",alignRight:!0,defaultValue:"1234.56",inputMode:"decimal"}},s={args:{placeholder:"Search categories"}},n={args:{label:"Locked field",defaultValue:"Read only",disabled:!0}},i={args:{label:"Email",defaultValue:"not-an-email","aria-invalid":!0}};var c,d,p;e.parameters={...e.parameters,docs:{...(c=e.parameters)==null?void 0:c.docs,source:{originalSource:"{}",...(p=(d=e.parameters)==null?void 0:d.docs)==null?void 0:p.source}}};var u,m,g;a.parameters={...a.parameters,docs:{...(u=a.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    label: 'Current balance',
    placeholder: '0'
  }
}`,...(g=(m=a.parameters)==null?void 0:m.docs)==null?void 0:g.source}}};var h,f,b;r.parameters={...r.parameters,docs:{...(h=r.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    label: 'Amount',
    prefix: '€',
    placeholder: '0',
    inputMode: 'decimal'
  }
}`,...(b=(f=r.parameters)==null?void 0:f.docs)==null?void 0:b.source}}};var x,S,W;l.parameters={...l.parameters,docs:{...(x=l.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    label: 'Rate',
    suffix: '%',
    placeholder: '0'
  }
}`,...(W=(S=l.parameters)==null?void 0:S.docs)==null?void 0:W.source}}};var R,v,y;o.parameters={...o.parameters,docs:{...(R=o.parameters)==null?void 0:R.docs,source:{originalSource:`{
  parameters: {
    layout: 'padded'
  },
  args: {
    label: 'Note',
    fullWidth: true,
    placeholder: 'Spans the container'
  }
}`,...(y=(v=o.parameters)==null?void 0:v.docs)==null?void 0:y.source}}};var V,F,L;t.parameters={...t.parameters,docs:{...(V=t.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    label: 'Saved this month',
    prefix: '€',
    alignRight: true,
    defaultValue: '1234.56',
    inputMode: 'decimal'
  }
}`,...(L=(F=t.parameters)==null?void 0:F.docs)==null?void 0:L.source}}};var M,T,A;s.parameters={...s.parameters,docs:{...(M=s.parameters)==null?void 0:M.docs,source:{originalSource:`{
  args: {
    placeholder: 'Search categories'
  }
}`,...(A=(T=s.parameters)==null?void 0:T.docs)==null?void 0:A.source}}};var D,P,k;n.parameters={...n.parameters,docs:{...(D=n.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    label: 'Locked field',
    defaultValue: 'Read only',
    disabled: true
  }
}`,...(k=(P=n.parameters)==null?void 0:P.docs)==null?void 0:k.source}}};var w,E,I;i.parameters={...i.parameters,docs:{...(w=i.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    label: 'Email',
    defaultValue: 'not-an-email',
    'aria-invalid': true
  }
}`,...(I=(E=i.parameters)==null?void 0:E.docs)==null?void 0:I.source}}};const j=["Default","WithLabel","WithPrefix","WithSuffix","FullWidth","AlignRight","Placeholder","Disabled","Invalid"];export{t as AlignRight,e as Default,n as Disabled,o as FullWidth,i as Invalid,s as Placeholder,a as WithLabel,r as WithPrefix,l as WithSuffix,j as __namedExportsOrder,U as default};
