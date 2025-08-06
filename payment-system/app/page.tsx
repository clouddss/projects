import BlunrForm from "../blunr-form"
import { BackgroundPattern } from "@/components/background-pattern"

export default function Page() {
  return (
    <div className="relative min-h-screen bg-blunr-darkblue flex items-center justify-center p-4 overflow-hidden">
      <BackgroundPattern />
      <BlunrForm />
    </div>
  )
}
