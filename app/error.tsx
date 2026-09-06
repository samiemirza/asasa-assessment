"use client";
import { Button } from "@/components/Button";
import { Header } from "@/components/Header";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header title="Something went wrong" subtitle="The server could not complete this request" />
      <div className="mt-4">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
