import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchCheck, MessageSquareText, Sparkles, Zap } from "lucide-react";
import { renderFormattedResponse } from "@/lib/text-formatter";
import type { AIInsightResponse, AIDetailedAnalysisResponse } from "@/types/ai";

interface DetailedAnalysisCardProps {
  aiInsightResult: AIInsightResponse;
  detailedAnalysisResult: AIDetailedAnalysisResponse | null;
  isGeneratingDetailed: boolean;
  isLoading: boolean;
  isGeneratingInsights: boolean;
  noApiKeysConfigured: boolean;
  onGenerateDetailedAnalysis: () => void;
  getLoadingMessage: (seconds: number) => string;
  getLoadingSubMessage: (seconds: number) => string;
  elapsedTime: number;
}

export function DetailedAnalysisCard({
  aiInsightResult,
  detailedAnalysisResult,
  isGeneratingDetailed,
  isLoading,
  isGeneratingInsights,
  noApiKeysConfigured,
  onGenerateDetailedAnalysis,
  getLoadingMessage,
  getLoadingSubMessage,
  elapsedTime,
}: DetailedAnalysisCardProps) {
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreamingComplete, setIsStreamingComplete] = useState(false);

  // Handle streaming response
  useEffect(() => {
    if (detailedAnalysisResult && 'stream' in detailedAnalysisResult && detailedAnalysisResult.stream) {
      const stream = detailedAnalysisResult.stream;
      const reader = stream.getReader();
      const decoder = new TextDecoder("utf-8");
      let content = "";
      
      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              setIsStreamingComplete(true);
              break;
            }
            
            // Decode the stream chunk and append to content
            const chunk = decoder.decode(value, { stream: true });
            content += chunk;
            setStreamingContent(content);
          }
        } catch (error) {
          console.error("Error reading stream:", error);
          setStreamingContent(prev => prev + "\n\nTerjadi kesalahan saat memproses respons. Silakan coba lagi.");
        } finally {
          reader.releaseLock();
        }
      };

      readStream();

      // Cleanup function to cancel the stream if component unmounts
      return () => {
        reader.cancel().catch(() => {});
      };
    }
  }, [detailedAnalysisResult]);

  // Reset streaming state when a new analysis is requested
  useEffect(() => {
    if (isGeneratingDetailed) {
      setStreamingContent("");
      setIsStreamingComplete(false);
    }
  }, [isGeneratingDetailed]);

  // Update isGeneratingDetailed when streaming is complete
  useEffect(() => {
    if (isStreamingComplete && isGeneratingDetailed) {
      // This will be handled by the parent component
      // We'll use a small timeout to ensure the UI updates smoothly
      const timer = setTimeout(() => {
        // The parent will set isGeneratingDetailed to false
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isStreamingComplete, isGeneratingDetailed]);

  if (!aiInsightResult.insights || aiInsightResult.insights.length === 0 || aiInsightResult.error) {
    return null;
  }

  const isStreaming = isGeneratingDetailed && !isStreamingComplete;
  const showLoading = isStreaming && !streamingContent;
  const showContent = (detailedAnalysisResult || streamingContent) && !showLoading;

  return (
    <div className="mt-10 mb-12 space-y-6">
      <Card className="border-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Analisis Perilaku Mendalam</CardTitle>
          <CardDescription className="text-muted-foreground">
            Dapatkan pemahaman yang lebih dalam tentang kebiasaan belanja
            emosional Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 space-y-6">
          {showContent && (
            <div className="space-y-6">
              {detailedAnalysisResult?.modelUsed &&
                detailedAnalysisResult.modelUsed !== "None" &&
                !detailedAnalysisResult.modelUsed.includes("(Error)") && (
                  <div className="flex items-center text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                    <MessageSquareText className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                    <span>Analisis mendalam oleh:{" "}
                    <span className="font-medium">
                      {detailedAnalysisResult.modelUsed.replace(
                        /\s*\(Error\)\s*/, ""
                      )}
                    </span></span>
                  </div>
                )}
              <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 bg-muted/20 p-4 rounded-lg border">
                {streamingContent ? (
                  renderFormattedResponse(streamingContent)
                ) : detailedAnalysisResult?.analysis ? (
                  renderFormattedResponse(detailedAnalysisResult.analysis)
                ) : null}
              </div>
            </div>
          )}

          {showLoading && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <Zap className="h-4 w-4 text-primary" />
                </motion.div>
                <div className="space-y-1">
                  <p className="font-medium">
                    {getLoadingMessage(elapsedTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getLoadingSubMessage(elapsedTime)}
                  </p>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-primary/80 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{
                    duration: 30,
                    ease: 'linear'
                  }}
                />
              </div>
            </div>
          )}

          {!detailedAnalysisResult && !isGeneratingDetailed && (
            <p className="text-sm text-muted-foreground">
              Klik tombol di bawah untuk mendapatkan analisis yang lebih detail.
            </p>
          )}

          {detailedAnalysisResult?.error && !isGeneratingDetailed && (
            <p className="text-sm text-destructive">
              {detailedAnalysisResult.analysis}
            </p>
          )}

          {/* Loading indicator that shows during streaming */}
          {isGeneratingDetailed && !isStreamingComplete && (
            <div className="flex items-center justify-center py-2">
              <motion.div
                className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <span className="ml-2 text-sm text-muted-foreground">
                Menganalisis...
              </span>
            </div>
          )}

          {(!isGeneratingDetailed || isStreamingComplete) && (
            <Button
              variant="default"
              size="sm"
              onClick={onGenerateDetailedAnalysis}
              disabled={
                isLoading ||
                isGeneratingInsights ||
                noApiKeysConfigured ||
                !!aiInsightResult.error
              }
              className="mt-4 flex items-center gap-2"
            >
              <SearchCheck className="h-4 w-4" />
              {detailedAnalysisResult && !detailedAnalysisResult.error
                ? "Analisis Ulang Mendalam"
                : "Analisis Mendalam"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}