import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-3xl font-bold mb-4">Opportunity Not Found</h1>
        <p className="text-zinc-400 mb-8">
          This opportunity may have been removed or doesn&apos;t exist.
        </p>
        <Link href="/browse">
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Browse
          </Button>
        </Link>
      </div>
    </div>
  )
}
