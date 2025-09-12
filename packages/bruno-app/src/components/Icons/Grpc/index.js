import React from 'react';

// UNARY - Single request, single response (Blue)
export const IconGrpcUnary = ({ size = 18, strokeWidth = 1.5, className = '' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    {/* Request arrow (top) - right */}
    <path d="M3 8h18" stroke="#3B82F6" strokeWidth={strokeWidth} />
    <path d="M18 5l3 3l-3 3" stroke="#3B82F6" strokeWidth={strokeWidth} />
    {/* Response arrow (bottom) - left */}
    <path d="M21 16h-18" stroke="#3B82F6" strokeWidth={strokeWidth} />
    <path d="M6 13l-3 3l3 3" stroke="#3B82F6" strokeWidth={strokeWidth} />
  </svg>
);

// CLIENT_STREAMING - Streaming request, single response (Purple)
export const IconGrpcClientStreaming = ({ size = 18, strokeWidth = 1.5, className = '' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    {/* Request arrow (top) - right with double heads */}
    <path d="M3 8h18" stroke="#8B5CF6" strokeWidth={strokeWidth} />
    <path d="M18 5l3 3l-3 3" stroke="#8B5CF6" strokeWidth={strokeWidth} />
    <path d="M14 5l3 3l-3 3" stroke="#8B5CF6" strokeWidth={strokeWidth} />
    {/* Response arrow (bottom) - left */}
    <path d="M21 16h-18" stroke="#8B5CF6" strokeWidth={strokeWidth} />
    <path d="M6 13l-3 3l3 3" stroke="#8B5CF6" strokeWidth={strokeWidth} />
  </svg>
);

// SERVER_STREAMING - Single request, streaming response (Green)
export const IconGrpcServerStreaming = ({ size = 18, strokeWidth = 1.5, className = '' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    {/* Request arrow (top) - right */}
    <path d="M3 8h18" stroke="#10B981" strokeWidth={strokeWidth} />
    <path d="M18 5l3 3l-3 3" stroke="#10B981" strokeWidth={strokeWidth} />
    {/* Response arrow (bottom) - left with double heads */}
    <path d="M21 16h-18" stroke="#10B981" strokeWidth={strokeWidth} />
    <path d="M6 13l-3 3l3 3" stroke="#10B981" strokeWidth={strokeWidth} />
    <path d="M10 13l-3 3l3 3" stroke="#10B981" strokeWidth={strokeWidth} />
  </svg>
);

// BIDI_STREAMING - Streaming request, streaming response (Orange)
export const IconGrpcBidiStreaming = ({ size = 18, strokeWidth = 1.5, className = '' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    {/* Request arrow (top) - right with double heads */}
    <path d="M3 8h18" stroke="#F97316" strokeWidth={strokeWidth} />
    <path d="M18 5l3 3l-3 3" stroke="#F97316" strokeWidth={strokeWidth} />
    <path d="M14 5l3 3l-3 3" stroke="#F97316" strokeWidth={strokeWidth} />
    {/* Response arrow (bottom) - left with double heads */}
    <path d="M21 16h-18" stroke="#F97316" strokeWidth={strokeWidth} />
    <path d="M6 13l-3 3l3 3" stroke="#F97316" strokeWidth={strokeWidth} />
    <path d="M10 13l-3 3l3 3" stroke="#F97316" strokeWidth={strokeWidth} />
  </svg>
);

export const IconProto = () => (
  // Copyright (c) 2022 Piotr Oleś <piotrek.oles@gmail.com>
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 512 512" style={{enableBackground: 'new 0 0 512 512'}} xmlSpace="preserve">
  <style type="text/css">
    {`.st0{clip-path:url(#XMLID_2_);fill:#DB4437;}
    .st1{clip-path:url(#XMLID_3_);}
    .st2{fill:#4285F4;}
    .st3{opacity:0.2;clip-path:url(#XMLID_4_);fill:#1A237E;enable-background:new;}
    .st4{clip-path:url(#XMLID_5_);}
    .st5{opacity:0.2;fill:#FFFFFF;enable-background:new;}
    .st6{opacity:0.2;clip-path:url(#XMLID_6_);fill:#3E2723;enable-background:new;}
    .st7{opacity:0.2;clip-path:url(#XMLID_7_);fill:#FFFFFF;enable-background:new;}
    .st8{clip-path:url(#XMLID_8_);fill:url(#XMLID_9_);}
    .st9{clip-path:url(#XMLID_10_);fill:#FFC107;}
    .st10{clip-path:url(#XMLID_11_);}
    .st11{fill:#0F9D58;}
    .st12{opacity:0.2;clip-path:url(#XMLID_12_);fill:#FFFFFF;enable-background:new;}
    .st13{opacity:0.2;clip-path:url(#XMLID_13_);fill:#FFFFFF;enable-background:new;}
    .st14{opacity:0.2;clip-path:url(#XMLID_14_);fill:#263238;enable-background:new;}
    .st15{clip-path:url(#XMLID_15_);fill:url(#XMLID_16_);}`}
  </style>
  <g id="XMLID_65_">
    <g id="XMLID_35_">
      <g>
        <defs>
          <path id="XMLID_64_" d="M230,105.9h-98.2l-78.4,136c-5,8.7-5,19.4,0,28.1l78.5,136H230l-86.6-150L230,105.9z"/>
        </defs>
        <clipPath id="XMLID_2_">
          <use xlinkHref="#XMLID_64_"  style={{overflow: 'visible'}}/>
        </clipPath>
        <polygon id="XMLID_51_" className="st0" points="143.4,256 230,105.9 131.9,105.9 94.4,170.9 			"/>
      </g>
      <g>
        <defs>
          <path id="XMLID_63_" d="M230,105.9h-98.2l-78.4,136c-5,8.7-5,19.4,0,28.1l78.5,136H230l-86.6-150L230,105.9z"/>
        </defs>
        <clipPath id="XMLID_3_">
          <use xlinkHref="#XMLID_63_"  style={{overflow: 'visible'}}/>
        </clipPath>
        <g id="XMLID_50_" className="st1">
          <g id="XMLID_95_">
            <path id="XMLID_103_" className="st2" d="M53.4,241.9c-5,8.7-5,19.4,0,28.1l78.5,136H230L94.4,170.9L53.4,241.9z"/>
          </g>
        </g>
      </g>
      <g>
        <defs>
          <path id="XMLID_62_" d="M230,105.9h-98.2l-78.4,136c-5,8.7-5,19.4,0,28.1l78.5,136H230l-86.6-150L230,105.9z"/>
        </defs>
        <clipPath id="XMLID_4_">
          <use xlinkHref="#XMLID_62_"  style={{overflow: 'visible'}}/>
        </clipPath>
        <path id="XMLID_49_" className="st3" d="M53.4,267.7c-2.3-4-3.5-8.4-3.7-12.9c-0.2,5.3,1,10.5,3.7,15.2l78.5,136H230l-1.4-2.3h-96.8
          L53.4,267.7z"/>
      </g>
      <g>
        <defs>
          <path id="XMLID_61_" d="M230,105.9h-98.2l-78.4,136c-5,8.7-5,19.4,0,28.1l78.5,136H230l-86.6-150L230,105.9z"/>
        </defs>
        <clipPath id="XMLID_5_">
          <use xlinkHref="#XMLID_61_"  style={{overflow: 'visible'}}/>
        </clipPath>
        <g id="XMLID_47_" className="st4">
          <polygon id="XMLID_48_" className="st5" points="131.9,105.9 94.4,170.9 95,172.1 131.9,108.3 228.7,108.3 230,105.9 				"/>
        </g>
      </g>
      <g>
        <defs>
          <path id="XMLID_60_" d="M230,105.9h-98.2l-78.4,136c-5,8.7-5,19.4,0,28.1l78.5,136H230l-86.6-150L230,105.9z"/>
        </defs>
        <clipPath id="XMLID_6_">
          <use xlinkHref="#XMLID_60_"  style={{overflow: 'visible'}}/>
        </clipPath>
        <polygon id="XMLID_46_" className="st6" points="143.4,256 230,105.9 228.7,105.9 142.8,254.8 			"/>
      </g>
      <g>
        <defs>
          <path id="XMLID_59_" d="M230,105.9h-98.2l-78.4,136c-5,8.7-5,19.4,0,28.1l78.5,136H230l-86.6-150L230,105.9z"/>
        </defs>
        <clipPath id="XMLID_7_">
          <use xlinkHref="#XMLID_59_"  style={{overflow: 'visible'}}/>
        </clipPath>
        <path id="XMLID_45_" className="st7" d="M53.4,244.3l41-71l134.3,232.8h1.4L94.4,170.9l-40.9,71c-2.7,4.7-3.9,10-3.7,15.2
          C49.9,252.7,51.1,248.3,53.4,244.3z"/>
      </g>
      <g>
        <defs>
          <path id="XMLID_58_" d="M230,105.9h-98.2l-78.4,136c-5,8.7-5,19.4,0,28.1l78.5,136H230l-86.6-150L230,105.9z"/>
        </defs>
        <clipPath id="XMLID_8_">
          <use xlinkHref="#XMLID_58_"  style={{overflow: 'visible'}}/>
        </clipPath>

          <radialGradient id="XMLID_9_" cx="2519.9409" cy="1752.7572" r="96.4638" gradientTransform="matrix(-1 0 0 1 2614.9185 -1580)" gradientUnits="userSpaceOnUse">
          <stop  offset="0" style="stop-color:#3E2723;stop-opacity:0.2"/>
          <stop  offset="1" style="stop-color:#3E2723;stop-opacity:2.000000e-02"/>
        </radialGradient>
        <polygon id="XMLID_38_" className="st8" points="143.4,256 156.6,233.2 94.4,171 			"/>
      </g>
    </g>
    <g id="XMLID_36_">
      <g>
        <defs>
          <path id="XMLID_57_" d="M458.6,241.9l-78.5-136H282L368.5,256L282,406.1h98.1l78.5-136C463.6,261.4,463.6,250.6,458.6,241.9z"/>
        </defs>
        <clipPath id="XMLID_10_">
          <use xlinkHref="#XMLID_57_"  style={{overflow: 'visible'}}/>
        </clipPath>
        <polygon id="XMLID_33_" className="st9" points="368.5,256 282,406.1 380.1,406.1 417.6,341.1 			"/>
      </g>
      <g>
        <defs>
          <path id="XMLID_56_" d="M458.6,241.9l-78.5-136H282L368.5,256L282,406.1h98.1l78.5-136C463.6,261.4,463.6,250.6,458.6,241.9z"/>
        </defs>
        <clipPath id="XMLID_11_">
          <use xlinkHref="#XMLID_56_"  style={{overflow: 'visible'}}/>
        </clipPath>
        <g id="XMLID_32_" className="st10">
          <g id="XMLID_99_">
            <path id="XMLID_105_" className="st11" d="M458.6,270.1c5-8.7,5-19.4,0-28.1l-78.5-136H282l135.7,235.1L458.6,270.1z"/>
          </g>
        </g>
      </g>
      <g>
        <defs>
          <path id="XMLID_55_" d="M458.6,241.9l-78.5-136H282L368.5,256L282,406.1h98.1l78.5-136C463.6,261.4,463.6,250.6,458.6,241.9z"/>
        </defs>
        <clipPath id="XMLID_12_">
          <use xlinkHref="#XMLID_55_"  style={{overflow: 'visible'}}/>
        </clipPath>
        <path id="XMLID_41_" className="st12" d="M458.6,244.3c2.3,4,3.5,8.4,3.7,12.9c0.2-5.3-1-10.5-3.7-15.2l-78.5-136H282l1.4,2.3h96.8
          L458.6,244.3z"/>
      </g>
      <g>
        <defs>
          <path id="XMLID_54_" d="M458.6,241.9l-78.5-136H282L368.5,256L282,406.1h98.1l78.5-136C463.6,261.4,463.6,250.6,458.6,241.9z"/>
        </defs>
        <clipPath id="XMLID_13_">
          <use xlinkHref="#XMLID_54_"  style={{overflow: 'visible'}}/>
        </clipPath>
        <polygon id="XMLID_42_" className="st13" points="368.5,256 282,406.1 283.3,406.1 369.2,257.2 			"/>
      </g>
      <g>
        <defs>
          <path id="XMLID_53_" d="M458.6,241.9l-78.5-136H282L368.5,256L282,406.1h98.1l78.5-136C463.6,261.4,463.6,250.6,458.6,241.9z"/>
        </defs>
        <clipPath id="XMLID_14_">
          <use xlinkHref="#XMLID_53_"  style={{overflow: 'visible'}}/>
        </clipPath>
        <path id="XMLID_43_" className="st14" d="M458.6,267.7l-41,71L283.3,105.9H282l135.7,235.1l40.9-71c2.7-4.7,3.9-10,3.7-15.2
          C462.1,259.3,460.9,263.7,458.6,267.7z"/>
      </g>
      <g>
        <defs>
          <path id="XMLID_52_" d="M458.6,241.9l-78.5-136H282L368.5,256L282,406.1h98.1l78.5-136C463.6,261.4,463.6,250.6,458.6,241.9z"/>
        </defs>
        <clipPath id="XMLID_15_">
          <use xlinkHref="#XMLID_52_"  style={{overflow: 'visible'}}/>
        </clipPath>

          <radialGradient id="XMLID_16_" cx="417.0054" cy="174.7572" r="96.4638" gradientTransform="matrix(1 0 0 -1 0 514)" gradientUnits="userSpaceOnUse">
          <stop  offset="0" style="stop-color:#BF360C;stop-opacity:0.2"/>
          <stop  offset="1" style="stop-color:#BF360C;stop-opacity:2.000000e-02"/>
        </radialGradient>
        <polygon id="XMLID_44_" className="st15" points="368.5,256 355.4,278.8 417.6,341"/>
      </g>
    </g>
  </g>
</svg>
)