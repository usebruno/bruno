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
