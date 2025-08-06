export function BackgroundPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute bottom-0 right-0">
        {/* Pattern of concentric circles to match the design */}
        <div className="absolute w-[1000px] h-[1000px] rounded-full bg-black/10 -right-80 -bottom-80" />
        <div className="absolute w-[800px] h-[800px] rounded-full bg-black/10 -right-60 -bottom-60" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-black/10 -right-40 -bottom-40" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-black/10 -right-20 -bottom-20" />
        <div className="absolute w-[200px] h-[200px] rounded-full bg-black/10 right-0 bottom-0" />
      </div>
    </div>
  )
}