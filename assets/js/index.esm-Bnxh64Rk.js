import{g as e,f as t,c as n,h as a,E as i,j as s,k as r,l as o,v as c,L as l,d,C as p,r as u,m as f,F as m}from"./index.esm-CXLk2X46.js";import"./index.esm-BWmfF91L.js";
/**
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
 */const h="analytics",g="https://www.googletagmanager.com/gtag/js",y=new l("@firebase/analytics"),w=new i("analytics","Analytics",{"already-exists":"A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.","already-initialized":"initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.","already-initialized-settings":"Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.","interop-component-reg-failed":"Firebase Analytics Interop Component failed to instantiate: {$reason}","invalid-analytics-context":"Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","indexeddb-unavailable":"IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","fetch-throttle":"The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.","config-fetch-failed":"Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}","no-api-key":'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.',"no-app-id":'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.',"no-client-id":'The "client_id" field is empty.',"invalid-gtag-resource":"Trusted Types detected an invalid gtag resource: {$gtagURL}."});
/**
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
 */
function I(e){if(!e.startsWith(g)){const t=w.create("invalid-gtag-resource",{gtagURL:e});return y.warn(t.message),""}return e}function b(e){return Promise.all(e.map(e=>e.catch(e=>e)))}function v(e,t){const n=function(e,t){let n;return window.trustedTypes&&(n=window.trustedTypes.createPolicy(e,t)),n}("firebase-js-sdk-policy",{createScriptURL:I}),a=document.createElement("script"),i=`${g}?l=${e}&id=${t}`;a.src=n?n?.createScriptURL(i):i,a.async=!0,document.head.appendChild(a)}function T(e,t,n,a){return async function(i,...s){try{if("event"===i){const[a,i]=s;await async function(e,t,n,a,i){try{let s=[];if(i&&i.send_to){let e=i.send_to;Array.isArray(e)||(e=[e]);const a=await b(n);for(const n of e){const e=a.find(e=>e.measurementId===n),i=e&&t[e.appId];if(!i){s=[];break}s.push(i)}}0===s.length&&(s=Object.values(t)),await Promise.all(s),e("event",a,i||{})}catch(s){y.error(s)}}(e,t,n,a,i)}else if("config"===i){const[i,r]=s;await async function(e,t,n,a,i,s){const r=a[i];try{if(r)await t[r];else{const e=(await b(n)).find(e=>e.measurementId===i);e&&await t[e.appId]}}catch(o){y.error(o)}e("config",i,s)}(e,t,n,a,i,r)}else if("consent"===i){const[t,n]=s;e("consent",t,n)}else if("get"===i){const[t,n,a]=s;e("get",t,n,a)}else if("set"===i){const[t]=s;e("set",t)}else e(i,...s)}catch(r){y.error(r)}}}const F=new class{constructor(e={},t=1e3){this.throttleMetadata=e,this.intervalMillis=t}getThrottleMetadata(e){return this.throttleMetadata[e]}setThrottleMetadata(e,t){this.throttleMetadata[e]=t}deleteThrottleMetadata(e){delete this.throttleMetadata[e]}};function $(e){return new Headers({Accept:"application/json","x-goog-api-key":e})}async function D(e,t=F,n){const{appId:a,apiKey:i,measurementId:s}=e.options;if(!a)throw w.create("no-app-id");if(!i){if(s)return{measurementId:s,appId:a};throw w.create("no-api-key")}const r=t.getThrottleMetadata(a)||{backoffCount:0,throttleEndTimeMillis:Date.now()},o=new A;return setTimeout(async()=>{o.abort()},6e4),M({appId:a,apiKey:i,measurementId:s},r,o,t)}async function M(e,{throttleEndTimeMillis:t,backoffCount:n},a,i=F){const{appId:s,measurementId:r}=e;try{await function(e,t){return new Promise((n,a)=>{const i=Math.max(t-Date.now(),0),s=setTimeout(n,i);e.addEventListener(()=>{clearTimeout(s),a(w.create("fetch-throttle",{throttleEndTimeMillis:t}))})})}(a,t)}catch(o){if(r)return y.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${r} provided in the "measurementId" field in the local Firebase config. [${o?.message}]`),{appId:s,measurementId:r};throw o}try{const t=await async function(e){const{appId:t,apiKey:n}=e,a={method:"GET",headers:$(n)},i="https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig".replace("{app-id}",t),s=await fetch(i,a);if(200!==s.status&&304!==s.status){let e="";try{const t=await s.json();t.error?.message&&(e=t.error.message)}catch(r){}throw w.create("config-fetch-failed",{httpStatus:s.status,responseMessage:e})}return s.json()}(e);return i.deleteThrottleMetadata(s),t}catch(o){const t=o;if(!function(e){if(!(e instanceof m&&e.customData))return!1;const t=Number(e.customData.httpStatus);return 429===t||500===t||503===t||504===t}(t)){if(i.deleteThrottleMetadata(s),r)return y.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${r} provided in the "measurementId" field in the local Firebase config. [${t?.message}]`),{appId:s,measurementId:r};throw o}const c=503===Number(t?.customData?.httpStatus)?f(n,i.intervalMillis,30):f(n,i.intervalMillis),l={throttleEndTimeMillis:Date.now()+c,backoffCount:n+1};return i.setThrottleMetadata(s,l),y.debug(`Calling attemptFetch again in ${c} millis`),M(e,l,a,i)}}class A{constructor(){this.listeners=[]}addEventListener(e){this.listeners.push(e)}abort(){this.listeners.forEach(e=>e())}}
/**
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
 */let x,k;function P(e){k=e}function z(e){x=e}
/**
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
 */async function j(e,t,n,a,i,s,r){const l=D(e);l.then(t=>{n[t.measurementId]=t.appId,e.options.measurementId&&t.measurementId!==e.options.measurementId&&y.warn(`The measurement ID in the local Firebase config (${e.options.measurementId}) does not match the measurement ID fetched from the server (${t.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)}).catch(e=>y.error(e)),t.push(l);const d=async function(){if(!o())return y.warn(w.create("indexeddb-unavailable",{errorInfo:"IndexedDB is not available in this environment."}).message),!1;try{await c()}catch(e){return y.warn(w.create("indexeddb-unavailable",{errorInfo:e?.toString()}).message),!1}return!0}().then(e=>e?a.getId():void 0),[p,u]=await Promise.all([l,d]);(function(e){const t=window.document.getElementsByTagName("script");for(const n of Object.values(t))if(n.src&&n.src.includes(g)&&n.src.includes(e))return n;return null}
/**
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
 */)(s)||v(s,p.measurementId),k&&(i("consent","default",k),P(void 0)),i("js",new Date);const f=r?.config??{};return f.origin="firebase",f.update=!0,null!=u&&(f.firebase_id=u),i("config",p.measurementId,f),x&&(i("set",x),z(void 0)),p.measurementId}
/**
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
 */class E{constructor(e){this.app=e}_delete(){return delete _[this.app.options.appId],Promise.resolve()}}let _={},C=[];const L={};let S,N,U="dataLayer",K="gtag",O=!1;function R(e){if(O)throw w.create("already-initialized");e.dataLayerName&&(U=e.dataLayerName),e.gtagName&&(K=e.gtagName)}function q(e,t,n){!function(){const e=[];if(s()&&e.push("This is a browser extension environment."),r()||e.push("Cookies are not available."),e.length>0){const t=e.map((e,t)=>`(${t+1}) ${e}`).join(" "),n=w.create("invalid-analytics-context",{errorInfo:t});y.warn(n.message)}}();const a=e.options.appId;if(!a)throw w.create("no-app-id");if(!e.options.apiKey){if(!e.options.measurementId)throw w.create("no-api-key");y.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${e.options.measurementId} provided in the "measurementId" field in the local Firebase config.`)}if(null!=_[a])throw w.create("already-exists",{id:a});if(!O){!function(e){let t=[];Array.isArray(window[e])?t=window[e]:window[e]=t}(U);const{wrappedGtag:e,gtagCore:t}=function(e,t,n,a,i){let s=function(...e){window[a].push(arguments)};return window[i]&&"function"==typeof window[i]&&(s=window[i]),window[i]=T(s,e,t,n),{gtagCore:s,wrappedGtag:window[i]}}(_,C,L,U,K);N=e,S=t,O=!0}_[a]=j(e,C,L,t,S,U,n);return new E(e)}function B(a=e()){a=t(a);const i=n(a,h);return i.isInitialized()?i.getImmediate():G(a)}function G(e,t={}){const i=n(e,h);if(i.isInitialized()){const e=i.getImmediate();if(a(t,i.getOptions()))return e;throw w.create("already-initialized")}return i.initialize({options:t})}async function W(){if(s())return!1;if(!r())return!1;if(!o())return!1;try{return await c()}catch(e){return!1}}function H(e,n,a){e=t(e),async function(e,t,n,a){if(a&&a.global)return e("set",{screen_name:n}),Promise.resolve();e("config",await t,{update:!0,screen_name:n})}(N,_[e.app.options.appId],n,a).catch(e=>y.error(e))}async function V(e){return e=t(e),async function(e,t){const n=await t;return new Promise((t,a)=>{e("get",n,"client_id",e=>{e||a(w.create("no-client-id")),t(e)})})}(N,_[e.app.options.appId])}function J(e,n,a){e=t(e),async function(e,t,n,a){if(a&&a.global)return e("set",{user_id:n}),Promise.resolve();e("config",await t,{update:!0,user_id:n})}(N,_[e.app.options.appId],n,a).catch(e=>y.error(e))}function Q(e,n,a){e=t(e),async function(e,t,n,a){if(a&&a.global){const t={};for(const e of Object.keys(n))t[`user_properties.${e}`]=n[e];return e("set",t),Promise.resolve()}e("config",await t,{update:!0,user_properties:n})}(N,_[e.app.options.appId],n,a).catch(e=>y.error(e))}function X(e,n){e=t(e),async function(e,t){const n=await e;window[`ga-disable-${n}`]=!t}(_[e.app.options.appId],n).catch(e=>y.error(e))}function Y(e){N?N("set",e):z(e)}function Z(e,n,a,i){e=t(e),async function(e,t,n,a,i){if(i&&i.global)e("event",n,a);else{const i=await t;e("event",n,{...a,send_to:i})}}(N,_[e.app.options.appId],n,a,i).catch(e=>y.error(e))}function ee(e){N?N("consent","update",e):P(e)}const te="@firebase/analytics",ne="0.10.22";d(new p(h,(e,{options:t})=>q(e.getProvider("app").getImmediate(),e.getProvider("installations-internal").getImmediate(),t),"PUBLIC")),d(new p("analytics-internal",function(e){try{const t=e.getProvider(h).getImmediate();return{logEvent:(e,n,a)=>Z(t,e,n,a),setUserProperties:(e,n)=>Q(t,e,n)}}catch(t){throw w.create("interop-component-reg-failed",{reason:t})}},"PRIVATE")),u(te,ne),u(te,ne,"esm2020");export{B as getAnalytics,V as getGoogleAnalyticsClientId,G as initializeAnalytics,W as isSupported,Z as logEvent,X as setAnalyticsCollectionEnabled,ee as setConsent,H as setCurrentScreen,Y as setDefaultEventParameters,J as setUserId,Q as setUserProperties,R as settings};
//# sourceMappingURL=index.esm-Bnxh64Rk.js.map
