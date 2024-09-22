const ComponentLevelErrorFallback = ({ error, resetErrorBoundary, hideReset }) => {
  return (
    <div role="alert" className='flex flex-col gap-2 w-fit'>
      <p>error occured while rendering!         {hideReset ? null : <button className='btn btn-sm w-fit border opacity-50 !py-[0.125rem] !px-[0.5rem]' onClick={resetErrorBoundary}>Reset</button>}</p>
      {hideReset ? null : <pre className='w-fit' style={{ color: "red" }}>{error.message}</pre>}
    </div>
  );
}

export default ComponentLevelErrorFallback;