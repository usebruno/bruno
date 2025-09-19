const Method = ({ method }) => {
  return (
    <span className={`${methodColors[method?.toUpperCase()] || 'text-white'} font-bold`}>
      {method?.toUpperCase()}
    </span>
  )  
}

const methodColors = {
  GET: 'text-green-500',
  POST: 'text-blue-500',
  PUT: 'text-yellow-500',
  DELETE: 'text-red-500',
  PATCH: 'text-purple-500',
  OPTIONS: 'text-gray-500',
  HEAD: 'text-gray-500',
};

export default Method;