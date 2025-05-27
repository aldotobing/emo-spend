import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  SearchCheck,
  MessageSquareText,
  Sparkles,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { renderFormattedResponse } from "@/lib/text-formatter";
import type { AIInsightResponse, AIDetailedAnalysisResponse } from "@/types/ai";
import { useEffect, useState, useRef } from 'react';

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
  stream?: ReadableStream<Uint8Array> | null;
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
  stream,
}: DetailedAnalysisCardProps) {
  const [streamContent, setStreamContent] = useState('');
  const [isStreamingComplete, setIsStreamingComplete] = useState(false);

  useEffect(() => {
    console.log('Stream received - is stream valid?', !!stream);
    
    if (!stream) {
      setStreamContent('');
      setIsStreamingComplete(false);
      return;
    }
    
    if (stream.locked) {
      console.error('Stream is locked and cannot be read');
      return;
    }
    
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    
    const processStream = async () => {
      try {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Stream completed');
            setIsStreamingComplete(true);
            break;
          }
          
          const chunk = decoder.decode(value);
          buffer += chunk;
          
          // Process each complete SSE event
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.substring(6).trim();
              if (jsonStr === '[DONE]') {
                setIsStreamingComplete(true);
                continue;
              }
              
              try {
                const data = JSON.parse(jsonStr);
                if (data.choices?.[0]?.delta?.content) {
                  setStreamContent(prev => prev + data.choices[0].delta.content);
                }
              } catch (error) {
                console.error('Error parsing JSON:', error);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error consuming stream:', error);
      } finally {
        reader.releaseLock();
      }
    };
    
    processStream();
    
    return () => {
      reader.cancel().catch(() => {});
    };
  }, [stream]);

  if (
    !aiInsightResult.insights ||
    aiInsightResult.insights.length === 0 ||
    aiInsightResult.error
  ) {
    return null;
  }

  return (
    <div className="mt-8 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Analisis Perilaku Mendalam</CardTitle>
          <CardDescription>
            Dapatkan pemahaman yang lebih dalam tentang kebiasaan belanja
            emosional Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!stream && detailedAnalysisResult && !isGeneratingDetailed && (
            <>
              {detailedAnalysisResult.modelUsed &&
                detailedAnalysisResult.modelUsed !== "None" &&
                !detailedAnalysisResult.modelUsed.includes("(Error)") && (
                  <div className="flex items-center text-xs text-muted-foreground mb-3">
                    <MessageSquareText className="h-3 w-3 mr-1.5" />
                    Analisis mendalam oleh:{" "}
                    {detailedAnalysisResult.modelUsed.replace(
                      /\s*\(Error\)\s*/,
                      ""
                    )}
                  </div>
                )}
              <div className="prose prose-sm dark:prose-invert max-w-none space-y-2">
                {renderFormattedResponse(detailedAnalysisResult.analysis || '')}
              </div>
            </>
          )}
          {stream && (
            <div className="space-y-4">
              {!isStreamingComplete && (
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
                  <p className="font-medium">Analyzing...</p>
                </div>
              )}
              <div className="prose prose-sm dark:prose-invert max-w-none space-y-2">
                {renderFormattedResponse(streamContent)}
              </div>
            </div>
          )}
          {(isGeneratingDetailed) && (
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
          {!detailedAnalysisResult && !isGeneratingDetailed && isStreamingComplete && (
            <p className="text-sm text-muted-foreground mt-4">
              Klik tombol di bawah untuk mendapatkan analisis yang lebih detail.
            </p>
          )}
          {detailedAnalysisResult?.error && !isGeneratingDetailed && isStreamingComplete && (
            <p className="text-sm text-destructive">
              {detailedAnalysisResult.analysis}
            </p>
          )}
          {(!stream || isStreamingComplete) && (
            <Button
              variant="default"
              size="sm"
              onClick={onGenerateDetailedAnalysis}
              disabled={
                isGeneratingDetailed ||
                isLoading ||
                isGeneratingInsights ||
                noApiKeysConfigured ||
                !!aiInsightResult.error
              }
              className="mt-2 flex items-center gap-2"
            >
              {isGeneratingDetailed ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
              ) : (
                <SearchCheck className="h-4 w-4" />
              )}
              {isGeneratingDetailed ? "Menganalisis..." : "Analisis Mendalam"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}