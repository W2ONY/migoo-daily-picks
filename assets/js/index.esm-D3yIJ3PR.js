import{g as t,f as e,c as n,h as r,E as i,k as a,L as o,l as s,n as c,d as u,C as l,r as f,v as d}from"./index.esm-CXLk2X46.js";import"./index.esm-BWmfF91L.js";var m,p,g=function(){var t=self.performance&&performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];if(t&&t.responseStart>0&&t.responseStart<performance.now())return t},h=function(t){if("loading"===document.readyState)return"loading";var e=g();if(e){if(t<e.domInteractive)return"loading";if(0===e.domContentLoadedEventStart||t<e.domContentLoadedEventStart)return"dom-interactive";if(0===e.domComplete||t<e.domComplete)return"dom-content-loaded"}return"complete"},v=function(t){var e=t.nodeName;return 1===t.nodeType?e.toLowerCase():e.toUpperCase().replace(/^#/,"")},b=function(t,e){var n="";try{for(;t&&9!==t.nodeType;){var r=t,i=r.id?"#"+r.id:v(r)+(r.classList&&r.classList.value&&r.classList.value.trim()&&r.classList.value.trim().length?"."+r.classList.value.trim().replace(/\s+/g,"."):"");if(n.length+i.length>(e||100)-1)return n||i;if(n=n?i+">"+n:i,r.id)break;t=r.parentNode}}catch(a){}return n},T=-1,y=function(t){addEventListener("pageshow",function(e){e.persisted&&(T=e.timeStamp,t(e))},!0)},_=function(){var t=g();return t&&t.activationStart||0},E=function(t,e){var n=g(),r="navigate";return T>=0?r="back-forward-cache":n&&(document.prerendering||_()>0?r="prerender":document.wasDiscarded?r="restore":n.type&&(r=n.type.replace(/_/g,"-"))),{name:t,value:void 0===e?-1:e,rating:"good",delta:0,entries:[],id:"v4-".concat(Date.now(),"-").concat(Math.floor(8999999999999*Math.random())+1e12),navigationType:r}},S=function(t,e,n){try{if(PerformanceObserver.supportedEntryTypes.includes(t)){var r=new PerformanceObserver(function(t){Promise.resolve().then(function(){e(t.getEntries())})});return r.observe(Object.assign({type:t,buffered:!0},n||{})),r}}catch(i){}},w=function(t,e,n,r){var i,a;return function(o){var s,c;e.value>=0&&(o||r)&&((a=e.value-(i||0))||void 0===i)&&(i=e.value,e.delta=a,e.rating=(s=e.value)>(c=n)[1]?"poor":s>c[0]?"needs-improvement":"good",t(e))}},I=function(t){requestAnimationFrame(function(){return requestAnimationFrame(function(){return t()})})},M=function(t){document.addEventListener("visibilitychange",function(){"hidden"===document.visibilityState&&t()})},A=function(t){var e=!1;return function(){e||(t(),e=!0)}},k=-1,C=function(){return"hidden"!==document.visibilityState||document.prerendering?1/0:0},N=function(t){"hidden"===document.visibilityState&&k>-1&&(k="visibilitychange"===t.type?t.timeStamp:0,L())},P=function(){addEventListener("visibilitychange",N,!0),addEventListener("prerenderingchange",N,!0)},L=function(){removeEventListener("visibilitychange",N,!0),removeEventListener("prerenderingchange",N,!0)},R=function(){return k<0&&(k=C(),P(),y(function(){setTimeout(function(){k=C(),P()},0)})),{get firstHiddenTime(){return k}}},F=function(t){document.prerendering?addEventListener("prerenderingchange",function(){return t()},!0):t()},O=[1800,3e3],U=[.1,.25],B=function(t,e){var n,r;n=function(e){var n=function(t){var e,n={};if(t.entries.length){var r=t.entries.reduce(function(t,e){return t&&t.value>e.value?t:e});if(r&&r.sources&&r.sources.length){var i=(e=r.sources).find(function(t){return t.node&&1===t.node.nodeType})||e[0];i&&(n={largestShiftTarget:b(i.node),largestShiftTime:r.startTime,largestShiftValue:r.value,largestShiftSource:i,largestShiftEntry:r,loadState:h(r.startTime)})}}return Object.assign(t,{attribution:n})}(e);t(n)},r=(r=e)||{},function(t,e){e=e||{},F(function(){var n,r=R(),i=E("FCP"),a=S("paint",function(t){t.forEach(function(t){"first-contentful-paint"===t.name&&(a.disconnect(),t.startTime<r.firstHiddenTime&&(i.value=Math.max(t.startTime-_(),0),i.entries.push(t),n(!0)))})});a&&(n=w(t,i,O,e.reportAllChanges),y(function(r){i=E("FCP"),n=w(t,i,O,e.reportAllChanges),I(function(){i.value=performance.now()-r.timeStamp,n(!0)})}))})}(A(function(){var t,e=E("CLS",0),i=0,a=[],o=function(n){n.forEach(function(t){if(!t.hadRecentInput){var e=a[0],n=a[a.length-1];i&&t.startTime-n.startTime<1e3&&t.startTime-e.startTime<5e3?(i+=t.value,a.push(t)):(i=t.value,a=[t])}}),i>e.value&&(e.value=i,e.entries=a,t())},s=S("layout-shift",o);s&&(t=w(n,e,U,r.reportAllChanges),M(function(){o(s.takeRecords()),t(!0)}),y(function(){i=0,e=E("CLS",0),t=w(n,e,U,r.reportAllChanges),I(function(){return t()})}),setTimeout(t,0))}))},x=0,D=1/0,z=0,$=function(t){t.forEach(function(t){t.interactionId&&(D=Math.min(D,t.interactionId),z=Math.max(z,t.interactionId),x=z?(z-D)/7+1:0)})},q=function(){return m?x:performance.interactionCount||0},j=[],W=new Map,V=0,K=[],H=function(t){if(K.forEach(function(e){return e(t)}),t.interactionId||"first-input"===t.entryType){var e=j[j.length-1],n=W.get(t.interactionId);if(n||j.length<10||t.duration>e.latency){if(n)t.duration>n.latency?(n.entries=[t],n.latency=t.duration):t.duration===n.latency&&t.startTime===n.entries[0].startTime&&n.entries.push(t);else{var r={id:t.interactionId,latency:t.duration,entries:[t]};W.set(r.id,r),j.push(r)}j.sort(function(t,e){return e.latency-t.latency}),j.length>10&&j.splice(10).forEach(function(t){return W.delete(t.id)})}}},J=function(t){var e=self.requestIdleCallback||self.setTimeout,n=-1;return t=A(t),"hidden"===document.visibilityState?t():(n=e(t),M(t)),n},G=[200,500],X=function(t,e){"PerformanceEventTiming"in self&&"interactionId"in PerformanceEventTiming.prototype&&(e=e||{},F(function(){var n;"interactionCount"in performance||m||(m=S("event",$,{type:"event",buffered:!0,durationThreshold:0}));var r,i=E("INP"),a=function(t){J(function(){t.forEach(H);var e=function(){var t=Math.min(j.length-1,Math.floor((q()-V)/50));return j[t]}();e&&e.latency!==i.value&&(i.value=e.latency,i.entries=e.entries,r())})},o=S("event",a,{durationThreshold:null!==(n=e.durationThreshold)&&void 0!==n?n:40});r=w(t,i,G,e.reportAllChanges),o&&(o.observe({type:"first-input",buffered:!0}),M(function(){a(o.takeRecords()),r(!0)}),y(function(){V=q(),j.length=0,W.clear(),i=E("INP"),r=w(t,i,G,e.reportAllChanges)}))}))},Z=[],Q=[],Y=0,tt=new WeakMap,et=new Map,nt=-1,rt=function(t){Z=Z.concat(t),it()},it=function(){nt<0&&(nt=J(at))},at=function(){et.size>10&&et.forEach(function(t,e){W.has(e)||et.delete(e)});var t=j.map(function(t){return tt.get(t.entries[0])}),e=Q.length-50;Q=Q.filter(function(n,r){return r>=e||t.includes(n)});for(var n=new Set,r=0;r<Q.length;r++){var i=Q[r];ot(i.startTime,i.processingEnd).forEach(function(t){n.add(t)})}var a=Z.length-1-50;Z=Z.filter(function(t,e){return t.startTime>Y&&e>a||n.has(t)}),nt=-1};K.push(function(t){t.interactionId&&t.target&&!et.has(t.interactionId)&&et.set(t.interactionId,t.target)},function(t){var e,n=t.startTime+t.duration;Y=Math.max(Y,t.processingEnd);for(var r=Q.length-1;r>=0;r--){var i=Q[r];if(Math.abs(n-i.renderTime)<=8){(e=i).startTime=Math.min(t.startTime,e.startTime),e.processingStart=Math.min(t.processingStart,e.processingStart),e.processingEnd=Math.max(t.processingEnd,e.processingEnd),e.entries.push(t);break}}e||(e={startTime:t.startTime,processingStart:t.processingStart,processingEnd:t.processingEnd,renderTime:n,entries:[t]},Q.push(e)),(t.interactionId||"first-input"===t.entryType)&&tt.set(t,e),it()});var ot=function(t,e){for(var n,r=[],i=0;n=Z[i];i++)if(!(n.startTime+n.duration<t)){if(n.startTime>e)break;r.push(n)}return r},st=function(t,e){p||(p=S("long-animation-frame",rt)),X(function(e){var n,r,i,a,o,s,c,u,l,f,d,m,p=(r=(n=e).entries[0],i=tt.get(r),a=r.processingStart,o=i.processingEnd,s=i.entries.sort(function(t,e){return t.processingStart-e.processingStart}),c=ot(r.startTime,o),u=n.entries.find(function(t){return t.target}),l=u&&u.target||et.get(r.interactionId),f=[r.startTime+r.duration,o].concat(c.map(function(t){return t.startTime+t.duration})),d=Math.max.apply(Math,f),m={interactionTarget:b(l),interactionTargetElement:l,interactionType:r.name.startsWith("key")?"keyboard":"pointer",interactionTime:r.startTime,nextPaintTime:d,processedEventEntries:s,longAnimationFrameEntries:c,inputDelay:a-r.startTime,processingDuration:o-a,presentationDelay:Math.max(d-o,0),loadState:h(r.startTime)},Object.assign(n,{attribution:m}));t(p)},e)},ct=[2500,4e3],ut={},lt=function(t,e){var n,r;n=function(e){var n=function(t){var e={timeToFirstByte:0,resourceLoadDelay:0,resourceLoadDuration:0,elementRenderDelay:t.value};if(t.entries.length){var n=g();if(n){var r=n.activationStart||0,i=t.entries[t.entries.length-1],a=i.url&&performance.getEntriesByType("resource").filter(function(t){return t.name===i.url})[0],o=Math.max(0,n.responseStart-r),s=Math.max(o,a?(a.requestStart||a.startTime)-r:0),c=Math.max(s,a?a.responseEnd-r:0),u=Math.max(c,i.startTime-r);e={element:b(i.element),timeToFirstByte:o,resourceLoadDelay:s-o,resourceLoadDuration:c-s,elementRenderDelay:u-c,navigationEntry:n,lcpEntry:i},i.url&&(e.url=i.url),a&&(e.lcpResourceEntry=a)}}return Object.assign(t,{attribution:e})}(e);t(n)},r=(r=e)||{},F(function(){var t,e=R(),i=E("LCP"),a=function(n){r.reportAllChanges||(n=n.slice(-1)),n.forEach(function(n){n.startTime<e.firstHiddenTime&&(i.value=Math.max(n.startTime-_(),0),i.entries=[n],t())})},o=S("largest-contentful-paint",a);if(o){t=w(n,i,ct,r.reportAllChanges);var s=A(function(){ut[i.id]||(a(o.takeRecords()),o.disconnect(),ut[i.id]=!0,t(!0))});["keydown","click"].forEach(function(t){addEventListener(t,function(){return J(s)},{once:!0,capture:!0})}),M(s),y(function(e){i=E("LCP"),t=w(n,i,ct,r.reportAllChanges),I(function(){i.value=performance.now()-e.timeStamp,ut[i.id]=!0,t(!0)})})}})};const ft="@firebase/performance",dt="0.7.12",mt=dt,pt="FB-PERF-TRACE-MEASURE",gt="_wt_",ht="_fcp",vt="_fid",bt="_lcp",Tt="_inp",yt="_cls",_t="@firebase/performance/config",Et="@firebase/performance/configexpire",St="Performance",wt=new i("performance",St,{"trace started":"Trace {$traceName} was started before.","trace stopped":"Trace {$traceName} is not running.","nonpositive trace startTime":"Trace {$traceName} startTime should be positive.","nonpositive trace duration":"Trace {$traceName} duration should be positive.","no window":"Window is not available.","no app id":"App id is not available.","no project id":"Project id is not available.","no api key":"Api key is not available.","invalid cc log":"Attempted to queue invalid cc event","FB not default":"Performance can only start when Firebase app instance is the default one.","RC response not ok":"RC response is not ok","invalid attribute name":"Attribute name {$attributeName} is invalid.","invalid attribute value":"Attribute value {$attributeValue} is invalid.","invalid custom metric name":"Custom metric name {$customMetricName} is invalid","invalid String merger input":"Input for String merger is invalid, contact support team to resolve.","already initialized":"initializePerformance() has already been called with different options. To avoid this error, call initializePerformance() with the same options as when it was originally called, or call getPerformance() to return the already initialized instance."}),It=new o(St);
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
 */
let Mt,At,kt,Ct;It.logLevel=c.INFO;class Nt{constructor(t){if(this.window=t,!t)throw wt.create("no window");this.performance=t.performance,this.PerformanceObserver=t.PerformanceObserver,this.windowLocation=t.location,this.navigator=t.navigator,this.document=t.document,this.navigator&&this.navigator.cookieEnabled&&(this.localStorage=t.localStorage),t.perfMetrics&&t.perfMetrics.onFirstInputDelay&&(this.onFirstInputDelay=t.perfMetrics.onFirstInputDelay),this.onLCP=lt,this.onINP=st,this.onCLS=B}getUrl(){return this.windowLocation.href.split("?")[0]}mark(t){this.performance&&this.performance.mark&&this.performance.mark(t)}measure(t,e,n){this.performance&&this.performance.measure&&this.performance.measure(t,e,n)}getEntriesByType(t){return this.performance&&this.performance.getEntriesByType?this.performance.getEntriesByType(t):[]}getEntriesByName(t){return this.performance&&this.performance.getEntriesByName?this.performance.getEntriesByName(t):[]}getTimeOrigin(){return this.performance&&(this.performance.timeOrigin||this.performance.timing.navigationStart)}requiredApisAvailable(){return fetch&&Promise&&a()?!!s()||(It.info("IndexedDB is not supported by current browser"),!1):(It.info("Firebase Performance cannot start if browser does not support fetch and Promise or cookie is disabled."),!1)}setupObserver(t,e){if(!this.PerformanceObserver)return;new this.PerformanceObserver(t=>{for(const n of t.getEntries())e(n)}).observe({entryTypes:[t]})}static getInstance(){return void 0===Mt&&(Mt=new Nt(At)),Mt}}function Pt(){return kt}
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
 */
function Lt(t,e){const n=t.length-e.length;if(n<0||n>1)throw wt.create("invalid String merger input");const r=[];for(let i=0;i<t.length;i++)r.push(t.charAt(i)),e.length>i&&r.push(e.charAt(i));return r.join("")}
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
 */class Rt{constructor(){this.instrumentationEnabled=!0,this.dataCollectionEnabled=!0,this.loggingEnabled=!1,this.tracesSamplingRate=1,this.networkRequestsSamplingRate=1,this.logEndPointUrl="https://firebaselogging.googleapis.com/v0cc/log?format=json_proto",this.flTransportEndpointUrl=Lt("hts/frbslgigp.ogepscmv/ieo/eaylg","tp:/ieaeogn-agolai.o/1frlglgc/o"),this.transportKey=Lt("AzSC8r6ReiGqFMyfvgow","Iayx0u-XT3vksVM-pIV"),this.logSource=462,this.logTraceAfterSampling=!1,this.logNetworkAfterSampling=!1,this.configTimeToLive=12,this.logMaxFlushSize=40}getFlTransportFullUrl(){return this.flTransportEndpointUrl.concat("?key=",this.transportKey)}static getInstance(){return void 0===Ct&&(Ct=new Rt),Ct}}
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
 */var Ft,Ot;(Ot=Ft||(Ft={}))[Ot.UNKNOWN=0]="UNKNOWN",Ot[Ot.VISIBLE=1]="VISIBLE",Ot[Ot.HIDDEN=2]="HIDDEN";const Ut=["firebase_","google_","ga_"],Bt=new RegExp("^[a-zA-Z]\\w*$");function xt(){const t=Nt.getInstance().navigator;return t?.serviceWorker?t.serviceWorker.controller?2:3:1}function Dt(){switch(Nt.getInstance().document.visibilityState){case"visible":return Ft.VISIBLE;case"hidden":return Ft.HIDDEN;default:return Ft.UNKNOWN}}function zt(){const t=Nt.getInstance().navigator.connection;switch(t&&t.effectiveType){case"slow-2g":return 1;case"2g":return 2;case"3g":return 3;case"4g":return 4;default:return 0}}
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
 */
function $t(t){const e=t.options?.appId;if(!e)throw wt.create("no app id");return e}
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
 */
const qt="0.0.1",jt={loggingEnabled:!0},Wt="FIREBASE_INSTALLATIONS_AUTH";function Vt(t,e){const n=function(){const t=Nt.getInstance().localStorage;if(!t)return;const e=t.getItem(Et);if(!(e&&(n=e,Number(n)>Date.now())))return;var n;const r=t.getItem(_t);if(!r)return;try{return JSON.parse(r)}catch{return}}();return n?(Ht(n),Promise.resolve()):function(t,e){return(n=t.installations,n.getToken()).then(n=>{const r=function(t){const e=t.options?.projectId;if(!e)throw wt.create("no project id");return e}(t.app),i=function(t){const e=t.options?.apiKey;if(!e)throw wt.create("no api key");return e}(t.app),a=new Request(`https://firebaseremoteconfig.googleapis.com/v1/projects/${r}/namespaces/fireperf:fetch?key=${i}`,{method:"POST",headers:{Authorization:`${Wt} ${n}`},body:JSON.stringify({app_instance_id:e,app_instance_id_token:n,app_id:$t(t.app),app_version:mt,sdk_version:qt})});return fetch(a).then(t=>{if(t.ok)return t.json();throw wt.create("RC response not ok")})}).catch(()=>{It.info(Kt)});var n}(t,e).then(Ht).then(t=>function(t){const e=Nt.getInstance().localStorage;if(!t||!e)return;e.setItem(_t,JSON.stringify(t)),e.setItem(Et,String(Date.now()+60*Rt.getInstance().configTimeToLive*60*1e3))}(t),()=>{})}const Kt="Could not fetch config, will use default configs";function Ht(t){if(!t)return t;const e=Rt.getInstance(),n=t.entries||{};return void 0!==n.fpr_enabled?e.loggingEnabled="true"===String(n.fpr_enabled):e.loggingEnabled=jt.loggingEnabled,n.fpr_log_source?e.logSource=Number(n.fpr_log_source):jt.logSource&&(e.logSource=jt.logSource),n.fpr_log_endpoint_url?e.logEndPointUrl=n.fpr_log_endpoint_url:jt.logEndPointUrl&&(e.logEndPointUrl=jt.logEndPointUrl),n.fpr_log_transport_key?e.transportKey=n.fpr_log_transport_key:jt.transportKey&&(e.transportKey=jt.transportKey),void 0!==n.fpr_vc_network_request_sampling_rate?e.networkRequestsSamplingRate=Number(n.fpr_vc_network_request_sampling_rate):void 0!==jt.networkRequestsSamplingRate&&(e.networkRequestsSamplingRate=jt.networkRequestsSamplingRate),void 0!==n.fpr_vc_trace_sampling_rate?e.tracesSamplingRate=Number(n.fpr_vc_trace_sampling_rate):void 0!==jt.tracesSamplingRate&&(e.tracesSamplingRate=jt.tracesSamplingRate),n.fpr_log_max_flush_size?e.logMaxFlushSize=Number(n.fpr_log_max_flush_size):jt.logMaxFlushSize&&(e.logMaxFlushSize=jt.logMaxFlushSize),e.logTraceAfterSampling=Jt(e.tracesSamplingRate),e.logNetworkAfterSampling=Jt(e.networkRequestsSamplingRate),t}function Jt(t){return Math.random()<=t}
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
 */let Gt,Xt=1;function Zt(t){return Xt=2,Gt=Gt||function(t){return function(){const t=Nt.getInstance().document;return new Promise(e=>{if(t&&"complete"!==t.readyState){const n=()=>{"complete"===t.readyState&&(t.removeEventListener("readystatechange",n),e())};t.addEventListener("readystatechange",n)}else e()})}().then(()=>t.installations.getId().then(t=>(kt=t,t))).then(e=>Vt(t,e)).then(()=>Qt(),()=>Qt())}(t),Gt}function Qt(){Xt=3}
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
 */const Yt=1e4,te=new TextEncoder;let ee,ne=3,re=[],ie=!1;function ae(t){setTimeout(()=>{ne<=0||(re.length>0&&function(){const t=re.splice(0,1e3);(function(t){const e=Rt.getInstance().getFlTransportFullUrl();return te.encode(t).length<=65536&&navigator.sendBeacon&&navigator.sendBeacon(e,t)?Promise.resolve():fetch(e,{method:"POST",body:t})})(oe(t)).then(()=>{ne=3}).catch(()=>{re=[...t,...re],ne--,It.info(`Tries left: ${ne}.`),ae(Yt)})}(),ae(Yt))},t)}function oe(t){const e=t.map(t=>({source_extension_json_proto3:t.message,event_time_ms:String(t.eventTime)})),n={request_time_ms:String(Date.now()),client_info:{client_type:1,js_client_info:{}},log_source:Rt.getInstance().logSource,log_event:e};return JSON.stringify(n)}function se(t){return(...e)=>{!function(t){if(!t.eventTime||!t.message)throw wt.create("invalid cc log");re=[...re,t]}({message:t(...e),eventTime:Date.now()})}}function ce(){const t=Rt.getInstance().getFlTransportFullUrl();for(;re.length>0;){const e=re.splice(-Rt.getInstance().logMaxFlushSize),n=oe(e);if(!navigator.sendBeacon||!navigator.sendBeacon(t,n)){re=[...re,...e];break}}if(re.length>0){const e=oe(re);fetch(t,{method:"POST",body:e}).catch(()=>{It.info("Failed flushing queued events.")})}}
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
 */function ue(t,e){ee||(ee={send:se(de),flush:ce}),ee.send(t,e)}function le(t){const e=Rt.getInstance();!e.instrumentationEnabled&&t.isAuto||(e.dataCollectionEnabled||t.isAuto)&&Nt.getInstance().requiredApisAvailable()&&(3===Xt?fe(t):Zt(t.performanceController).then(()=>fe(t),()=>fe(t)))}function fe(t){if(!Pt())return;const e=Rt.getInstance();e.loggingEnabled&&e.logTraceAfterSampling&&ue(t,1)}function de(t,e){return 0===e?function(t){const e={url:t.url,http_method:t.httpMethod||0,http_response_code:200,response_payload_bytes:t.responsePayloadBytes,client_start_time_us:t.startTimeUs,time_to_response_initiated_us:t.timeToResponseInitiatedUs,time_to_response_completed_us:t.timeToResponseCompletedUs},n={application_info:me(t.performanceController.app),network_request_metric:e};return JSON.stringify(n)}(t):function(t){const e={name:t.name,is_auto:t.isAuto,client_start_time_us:t.startTimeUs,duration_us:t.durationUs};0!==Object.keys(t.counters).length&&(e.counters=t.counters);const n=t.getAttributes();0!==Object.keys(n).length&&(e.custom_attributes=n);const r={application_info:me(t.performanceController.app),trace_metric:e};return JSON.stringify(r)}(t)}function me(t){return{google_app_id:$t(t),app_instance_id:Pt(),web_app_info:{sdk_version:mt,page_url:Nt.getInstance().getUrl(),service_worker_status:xt(),visibility_state:Dt(),effective_connection_type:zt()},application_process_state:0}}
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
 */function pe(t,e){const n=e;if(!n||void 0===n.responseStart)return;const r=Nt.getInstance().getTimeOrigin(),i=Math.floor(1e3*(n.startTime+r)),a=n.responseStart?Math.floor(1e3*(n.responseStart-n.startTime)):void 0,o=Math.floor(1e3*(n.responseEnd-n.startTime));!function(t){const e=Rt.getInstance();if(!e.instrumentationEnabled)return;const n=t.url,r=e.logEndPointUrl.split("?")[0],i=e.flTransportEndpointUrl.split("?")[0];n!==r&&n!==i&&e.loggingEnabled&&e.logNetworkAfterSampling&&ue(t,0)}({performanceController:t,url:n.name&&n.name.split("?")[0],responsePayloadBytes:n.transferSize,startTimeUs:i,timeToResponseInitiatedUs:a,timeToResponseCompletedUs:o})}
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
 */const ge=["_fp",ht,vt,bt,yt,Tt];
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
 */
class he{constructor(t,e,n=!1,r){this.performanceController=t,this.name=e,this.isAuto=n,this.state=1,this.customAttributes={},this.counters={},this.api=Nt.getInstance(),this.randomId=Math.floor(1e6*Math.random()),this.isAuto||(this.traceStartMark=`FB-PERF-TRACE-START-${this.randomId}-${this.name}`,this.traceStopMark=`FB-PERF-TRACE-STOP-${this.randomId}-${this.name}`,this.traceMeasure=r||`${pt}-${this.randomId}-${this.name}`,r&&this.calculateTraceMetrics())}start(){if(1!==this.state)throw wt.create("trace started",{traceName:this.name});this.api.mark(this.traceStartMark),this.state=2}stop(){if(2!==this.state)throw wt.create("trace stopped",{traceName:this.name});this.state=3,this.api.mark(this.traceStopMark),this.api.measure(this.traceMeasure,this.traceStartMark,this.traceStopMark),this.calculateTraceMetrics(),le(this)}record(t,e,n){if(t<=0)throw wt.create("nonpositive trace startTime",{traceName:this.name});if(e<=0)throw wt.create("nonpositive trace duration",{traceName:this.name});if(this.durationUs=Math.floor(1e3*e),this.startTimeUs=Math.floor(1e3*t),n&&n.attributes&&(this.customAttributes={...n.attributes}),n&&n.metrics)for(const r of Object.keys(n.metrics))isNaN(Number(n.metrics[r]))||(this.counters[r]=Math.floor(Number(n.metrics[r])));le(this)}incrementMetric(t,e=1){void 0===this.counters[t]?this.putMetric(t,e):this.putMetric(t,this.counters[t]+e)}putMetric(t,e){if(n=t,r=this.name,0===n.length||n.length>100||!(r&&r.startsWith(gt)&&ge.indexOf(n)>-1)&&n.startsWith("_"))throw wt.create("invalid custom metric name",{customMetricName:t});var n,r;this.counters[t]=function(t){const e=Math.floor(t);return e<t&&It.info(`Metric value should be an Integer, setting the value as : ${e}.`),e}(e??0)}getMetric(t){return this.counters[t]||0}putAttribute(t,e){const n=!(0===(r=t).length||r.length>40||Ut.some(t=>r.startsWith(t))||!r.match(Bt));var r;const i=function(t){return 0!==t.length&&t.length<=100}(e);if(n&&i)this.customAttributes[t]=e;else{if(!n)throw wt.create("invalid attribute name",{attributeName:t});if(!i)throw wt.create("invalid attribute value",{attributeValue:e})}}getAttribute(t){return this.customAttributes[t]}removeAttribute(t){void 0!==this.customAttributes[t]&&delete this.customAttributes[t]}getAttributes(){return{...this.customAttributes}}setStartTime(t){this.startTimeUs=t}setDuration(t){this.durationUs=t}calculateTraceMetrics(){const t=this.api.getEntriesByName(this.traceMeasure),e=t&&t[0];e&&(this.durationUs=Math.floor(1e3*e.duration),this.startTimeUs=Math.floor(1e3*(e.startTime+this.api.getTimeOrigin())))}static createOobTrace(t,e,n,r,i){const a=Nt.getInstance().getUrl();if(!a)return;const o=new he(t,gt+a,!0),s=Math.floor(1e3*Nt.getInstance().getTimeOrigin());o.setStartTime(s),e&&e[0]&&(o.setDuration(Math.floor(1e3*e[0].duration)),o.putMetric("domInteractive",Math.floor(1e3*e[0].domInteractive)),o.putMetric("domContentLoadedEventEnd",Math.floor(1e3*e[0].domContentLoadedEventEnd)),o.putMetric("loadEventEnd",Math.floor(1e3*e[0].loadEventEnd)));if(n){const t=n.find(t=>"first-paint"===t.name);t&&t.startTime&&o.putMetric("_fp",Math.floor(1e3*t.startTime));const e=n.find(t=>"first-contentful-paint"===t.name);e&&e.startTime&&o.putMetric(ht,Math.floor(1e3*e.startTime)),i&&o.putMetric(vt,Math.floor(1e3*i))}this.addWebVitalMetric(o,bt,"lcp_element",r.lcp),this.addWebVitalMetric(o,yt,"cls_largestShiftTarget",r.cls),this.addWebVitalMetric(o,Tt,"inp_interactionTarget",r.inp),le(o),ee&&ee.flush()}static addWebVitalMetric(t,e,n,r){r&&(t.putMetric(e,Math.floor(1e3*r.value)),r.elementAttribution&&(r.elementAttribution.length>100?t.putAttribute(n,r.elementAttribution.substring(0,100)):t.putAttribute(n,r.elementAttribution)))}static createUserTimingTrace(t,e){le(new he(t,e,!1,e))}}
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
 */let ve,be={},Te=!1;function ye(t){Pt()&&(setTimeout(()=>function(t){const e=Nt.getInstance();"onpagehide"in window?e.document.addEventListener("pagehide",()=>Ee(t)):e.document.addEventListener("unload",()=>Ee(t));e.document.addEventListener("visibilitychange",()=>{"hidden"===e.document.visibilityState&&Ee(t)}),e.onFirstInputDelay&&e.onFirstInputDelay(t=>{ve=t});e.onLCP(t=>{be.lcp={value:t.value,elementAttribution:t.attribution?.element}}),e.onCLS(t=>{be.cls={value:t.value,elementAttribution:t.attribution?.largestShiftTarget}}),e.onINP(t=>{be.inp={value:t.value,elementAttribution:t.attribution?.interactionTarget}})}(t),0),setTimeout(()=>function(t){const e=Nt.getInstance(),n=e.getEntriesByType("resource");for(const r of n)pe(t,r);e.setupObserver("resource",e=>pe(t,e))}(t),0),setTimeout(()=>function(t){const e=Nt.getInstance(),n=e.getEntriesByType("measure");for(const r of n)_e(t,r);e.setupObserver("measure",e=>_e(t,e))}(t),0))}function _e(t,e){const n=e.name;n.substring(0,21)!==pt&&he.createUserTimingTrace(t,n)}function Ee(t){if(!Te){Te=!0;const e=Nt.getInstance(),n=e.getEntriesByType("navigation"),r=e.getEntriesByType("paint");setTimeout(()=>{he.createOobTrace(t,n,r,be,ve)},0)}}
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
 */class Se{constructor(t,e){this.app=t,this.installations=e,this.initialized=!1}_init(t){this.initialized||(void 0!==t?.dataCollectionEnabled&&(this.dataCollectionEnabled=t.dataCollectionEnabled),void 0!==t?.instrumentationEnabled&&(this.instrumentationEnabled=t.instrumentationEnabled),Nt.getInstance().requiredApisAvailable()?d().then(t=>{t&&(ie||(ae(5500),ie=!0),Zt(this).then(()=>ye(this),()=>ye(this)),this.initialized=!0)}).catch(t=>{It.info(`Environment doesn't support IndexedDB: ${t}`)}):It.info('Firebase Performance cannot start if the browser does not support "Fetch" and "Promise", or cookies are disabled.'))}set instrumentationEnabled(t){Rt.getInstance().instrumentationEnabled=t}get instrumentationEnabled(){return Rt.getInstance().instrumentationEnabled}set dataCollectionEnabled(t){Rt.getInstance().dataCollectionEnabled=t}get dataCollectionEnabled(){return Rt.getInstance().dataCollectionEnabled}}function we(r=t()){r=e(r);return n(r,"performance").getImmediate()}function Ie(t,i){t=e(t);const a=n(t,"performance");if(a.isInitialized()){const t=a.getImmediate(),e=a.getOptions();if(r(e,i??{}))return t;throw wt.create("already initialized")}return a.initialize({options:i})}function Me(t,n){return t=e(t),new he(t,n)}u(new l("performance",(t,{options:e})=>{const n=t.getProvider("app").getImmediate(),r=t.getProvider("installations-internal").getImmediate();if("[DEFAULT]"!==n.name)throw wt.create("FB not default");if("undefined"==typeof window)throw wt.create("no window");var i;
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
 */i=window,At=i;const a=new Se(n,r);return a._init(e),a},"PUBLIC")),f(ft,dt),f(ft,dt,"esm2020");export{we as getPerformance,Ie as initializePerformance,Me as trace};
//# sourceMappingURL=index.esm-D3yIJ3PR.js.map
