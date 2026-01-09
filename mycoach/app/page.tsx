import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">Welcome to Coach Alan</h1>
        <p className="text-white/80 text-xl mb-8">Your strategic AI coach</p>
        <Link
          href="/coach-alan"
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105"
        >
          Start Coaching Session
        </Link>
      </div>
    </div>
  )
}

