import { Button } from '../../components/Button'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center flex-col gap-4">
      <h1 className="text-4xl font-bold text-blue-600">
        Welcome to Your Next.js App!
      </h1>
      <Button onClick={() => alert('Hello!')}>
        Click Me
      </Button>
    </div>
  )
}
