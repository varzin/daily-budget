import{B as e}from"./iframe-OnfYtxzL.js";import"./preload-helper-C1FmrZbK.js";const V="_metric_t5z2a_1",H="_label_t5z2a_5",J="_value_t5z2a_13",K="_sym_t5z2a_20",L="_sub_t5z2a_25",Q="_featured_t5z2a_33",U="_green_t5z2a_78",X="_teal_t5z2a_79",Z="_yellow_t5z2a_80",$="_orange_t5z2a_81",ee="_blue_t5z2a_82",ae="_deficit_t5z2a_89",t={metric:V,label:H,value:J,sym:K,sub:L,featured:Q,green:U,teal:X,yellow:Z,orange:$,blue:ee,deficit:ae};function te(...a){return a.filter(Boolean).join(" ")}function d({featured:a,tone:p,label:P,symbol:W="€",value:Y,subtitle:m,id:I}){return e.jsxs("div",{className:te(t.metric,a&&t.featured,p&&t[p]),id:I,children:[e.jsx("div",{className:t.label,children:P}),e.jsxs("div",{className:t.value,children:[e.jsx("span",{className:t.sym,children:W}),e.jsx("span",{children:Y})]}),m!==void 0&&e.jsx("div",{className:t.sub,children:m})]})}d.__docgenInfo={description:"",methods:[],displayName:"MetricCard",props:{featured:{required:!1,tsType:{name:"boolean"},description:"Render the hero treatment (large serif italic, full-width). Can combine with tone."},tone:{required:!1,tsType:{name:"union",raw:"'green' | 'teal' | 'yellow' | 'orange' | 'blue' | 'deficit'",elements:[{name:"literal",value:"'green'"},{name:"literal",value:"'teal'"},{name:"literal",value:"'yellow'"},{name:"literal",value:"'orange'"},{name:"literal",value:"'blue'"},{name:"literal",value:"'deficit'"}]},description:""},label:{required:!0,tsType:{name:"string"},description:""},symbol:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'€'",computed:!1}},value:{required:!0,tsType:{name:"string"},description:""},subtitle:{required:!1,tsType:{name:"ReactNode"},description:""},id:{required:!1,tsType:{name:"string"},description:""}}};const se={title:"Dashboard/MetricCard",component:d,parameters:{layout:"padded",docs:{description:{component:"The dashboard metric tile. A `tone` paints the accent (the situation widget\npicks teal/green/orange/deficit), `featured` gives the hero treatment (large\nserif italic, full width). Symbol + value + optional subtitle."}}},args:{label:"Daily budget",symbol:"€",value:"42.50",featured:!1},argTypes:{tone:{control:"select",options:[void 0,"green","teal","yellow","orange","blue","deficit"]},featured:{control:"boolean"},label:{control:"text"},value:{control:"text"},symbol:{control:"text"},subtitle:{control:"text"}}},n={},s={args:{featured:!0,label:"You can spend today",value:"38.00",subtitle:"until your next income day"}},l={args:{tone:"green",label:"On track",value:"42.50"}},o={args:{tone:"teal",featured:!0,label:"Ahead of plan",value:"55.00",subtitle:"keeping the full cushion"}},i={args:{tone:"orange",featured:!0,label:"Dipping into savings",value:"28.00"}},c={args:{tone:"deficit",featured:!0,label:"Over budget",value:"-12.00",subtitle:"spending exceeds plan + cushion"}},u={args:{label:"Per day (green)",value:"40.00",subtitle:"keeps your cushion intact"}},r={render:()=>e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))",gap:12},children:["green","teal","yellow","orange","blue","deficit"].map(a=>e.jsx(d,{tone:a,label:a,symbol:"€",value:"42.50"},a))})};var g,b,f;n.parameters={...n.parameters,docs:{...(g=n.parameters)==null?void 0:g.docs,source:{originalSource:"{}",...(f=(b=n.parameters)==null?void 0:b.docs)==null?void 0:f.source}}};var y,v,_;s.parameters={...s.parameters,docs:{...(y=s.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    featured: true,
    label: 'You can spend today',
    value: '38.00',
    subtitle: 'until your next income day'
  }
}`,...(_=(v=s.parameters)==null?void 0:v.docs)==null?void 0:_.source}}};var h,x,T;l.parameters={...l.parameters,docs:{...(h=l.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    tone: 'green',
    label: 'On track',
    value: '42.50'
  }
}`,...(T=(x=l.parameters)==null?void 0:x.docs)==null?void 0:T.source}}};var w,z,S;o.parameters={...o.parameters,docs:{...(w=o.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    tone: 'teal',
    featured: true,
    label: 'Ahead of plan',
    value: '55.00',
    subtitle: 'keeping the full cushion'
  }
}`,...(S=(z=o.parameters)==null?void 0:z.docs)==null?void 0:S.source}}};var j,k,q;i.parameters={...i.parameters,docs:{...(j=i.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    tone: 'orange',
    featured: true,
    label: 'Dipping into savings',
    value: '28.00'
  }
}`,...(q=(k=i.parameters)==null?void 0:k.docs)==null?void 0:q.source}}};var D,C,N;c.parameters={...c.parameters,docs:{...(D=c.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    tone: 'deficit',
    featured: true,
    label: 'Over budget',
    value: '-12.00',
    subtitle: 'spending exceeds plan + cushion'
  }
}`,...(N=(C=c.parameters)==null?void 0:C.docs)==null?void 0:N.source}}};var O,A,M;u.parameters={...u.parameters,docs:{...(O=u.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    label: 'Per day (green)',
    value: '40.00',
    subtitle: 'keeps your cushion intact'
  }
}`,...(M=(A=u.parameters)==null?void 0:A.docs)==null?void 0:M.source}}};var E,R,B,F,G;r.parameters={...r.parameters,docs:{...(E=r.parameters)==null?void 0:E.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12
  }}>
      {(['green', 'teal', 'yellow', 'orange', 'blue', 'deficit'] as const).map(tone => <MetricCard key={tone} tone={tone} label={tone} symbol="€" value="42.50" />)}
    </div>
}`,...(B=(R=r.parameters)==null?void 0:R.docs)==null?void 0:B.source},description:{story:"Every tone in a grid for a quick palette check.",...(G=(F=r.parameters)==null?void 0:F.docs)==null?void 0:G.description}}};const le=["Default","Featured","ToneGreen","ToneTeal","ToneOrange","Deficit","WithSubtitle","AllTones"];export{r as AllTones,n as Default,c as Deficit,s as Featured,l as ToneGreen,i as ToneOrange,o as ToneTeal,u as WithSubtitle,le as __namedExportsOrder,se as default};
