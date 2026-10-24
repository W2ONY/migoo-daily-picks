import{m as e}from"./editor.api-Bo6jdsez.js";
/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.54.0(7c2310116c57517348bbd868a21139f32454be22)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/var a=Object.defineProperty,t=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,o=Object.prototype.hasOwnProperty,s={};((e,s,i,n)=>{if(s&&"object"==typeof s||"function"==typeof s)for(let g of r(s))o.call(e,g)||g===i||a(e,g,{get:()=>s[g],enumerable:!(n=t(s,g))||n.enumerable})})(s,e,"default");var i={},n={},g=class e{static getOrCreate(a){return n[a]||(n[a]=new e(a)),n[a]}constructor(e){this._languageId=e,this._loadingTriggered=!1,this._lazyLoadPromise=new Promise((e,a)=>{this._lazyLoadPromiseResolve=e,this._lazyLoadPromiseReject=a})}load(){return this._loadingTriggered||(this._loadingTriggered=!0,i[this._languageId].loader().then(e=>this._lazyLoadPromiseResolve(e),e=>this._lazyLoadPromiseReject(e))),this._lazyLoadPromise}};function l(e){const a=e.id;i[a]=e,s.languages.register(e);const t=g.getOrCreate(a);s.languages.registerTokensProviderFactory(a,{create:async()=>(await t.load()).language}),s.languages.onLanguageEncountered(a,async()=>{const e=await t.load();s.languages.setLanguageConfiguration(a,e.conf)})}export{l as r};
//# sourceMappingURL=_.contribution-DeJ0trOd.js.map
