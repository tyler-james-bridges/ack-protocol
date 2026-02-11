'use client';

import { useLoginWithAbstract } from '@abstract-foundation/agw-react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Nav } from '@/components/nav';
import { KudosForm } from '@/components/kudos-form';
import { useGiveKudos } from '@/hooks';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function GiveKudosPage() {
  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { giveKudos, status, txHash, reset, isLoading } = useGiveKudos();

  const handleSubmit = (data: {
    agent: { token_id: string };
    category: string;
    message: string;
  }) => {
    if (!address) return;
    giveKudos({
      agentId: Number(data.agent.token_id),
      category: data.category as Parameters<typeof giveKudos>[0]['category'],
      message: data.message,
      clientAddress: address,
    });
  };

  return (
    <div className="min-h-screen">
      <Nav />

      <div className="mx-auto max-w-2xl px-4 pt-12 pb-16">
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6 pt-12"
            >
              <div className="text-6xl">&#127881;</div>
              <h1 className="text-3xl font-bold">Kudos Sent!</h1>
              <p className="text-muted-foreground">
                Your kudos is now onchain on the ERC-8004 Reputation Registry.
              </p>
              {txHash && (
                <a
                  href={`https://abscan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View transaction
                </a>
              )}
              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={reset}>Give Another</Button>
                <Link href="/">
                  <Button variant="outline">Back to Home</Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">Give Kudos</h1>
                <p className="text-muted-foreground">
                  Recognize an agent for great work. Your kudos goes directly
                  onchain via ERC-8004.
                </p>
              </div>

              {!isConnected ? (
                <div className="rounded-xl border border-border p-8 text-center space-y-4">
                  <p className="text-muted-foreground">
                    Connect your wallet to give kudos.
                  </p>
                  <Button size="lg" onClick={() => login()}>
                    Connect with Abstract
                  </Button>
                </div>
              ) : (
                <>
                  <KudosForm onSubmit={handleSubmit} isLoading={isLoading} />

                  {status === 'error' && (
                    <p className="text-sm text-destructive text-center">
                      Something went wrong. Please try again.
                    </p>
                  )}

                  {(status === 'confirming' ||
                    status === 'waiting') && (
                    <div className="text-center text-sm text-muted-foreground space-y-1">
                      {status === 'confirming' && (
                        <p>Confirm in your wallet...</p>
                      )}
                      {status === 'waiting' && (
                        <p>Waiting for confirmation...</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
