const StepsFlow = () => {
  return (
    <div className="w-full flex flex-col sm:flex-row justify-center items-center gap-4 text-center py-10 px-4 mt-[-50px] mb-[-30px] sm:mt-10 sm:mb-4">
      <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-transparent bg-clip-text">
        Search
      </h2>

      <span className="text-black text-3xl sm:hidden">↓</span>
      <span className="text-black text-3xl hidden sm:inline-block">→</span>

      <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-transparent bg-clip-text">
        Apply
      </h2>

      <span className="text-black text-3xl sm:hidden">↓</span>
      <span className="text-black text-3xl hidden sm:inline-block">→</span>

      <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-transparent bg-clip-text">
        Interview
      </h2>

      <span className="text-black text-3xl sm:hidden">↓</span>
      <span className="text-black text-3xl hidden sm:inline-block">→</span>

      <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-transparent bg-clip-text">
        Get Hired
      </h2>
    </div>
  );
};

export default StepsFlow;
