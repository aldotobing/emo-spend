import React, { JSX, useEffect, useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Skeleton } from "@/components/ui/skeleton";
  import {
    Lightbulb,
    TrendingUp,
    AlertTriangle,
    Brain,
    Sparkles,
    Zap,
  } from "lucide-react";
  import { motion } from "framer-motion";
  import { renderFormattedResponse } from "@/lib/text-formatter";
  import type { Expense } from "@/types/expense";
  import type { AIResponse } from "@/types/ai";
  
  interface AIInsightCardsProps {
    isLoading: boolean;
    insights: string[];
    error?: string;
    expenses: Expense[];
    period: "week" | "month" | "year";
    aiResponse?: AIResponse;
  }
  
  export function AIInsightCards({
    isLoading,
    insights,
    error,
    expenses,
    period,
    aiResponse,
  }: AIInsightCardsProps) {
    const [streamingContent, setStreamingContent] = useState<string>('');
    const icons = [Lightbulb, TrendingUp, AlertTriangle, Brain, Sparkles];

    // Handle streaming response if available
    useEffect(() => {
      if (aiResponse?.stream) {
        const reader = aiResponse.stream.getReader();
        const decoder = new TextDecoder();
        let content = '';
        
        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              content += chunk;
              setStreamingContent(content);
            }
            // Ensure all remaining content is processed
            const finalChunk = decoder.decode();
            if (finalChunk) {
              content += finalChunk;
              setStreamingContent(content);
            }
          } catch (error) {
            console.error('Error reading stream:', error);
          } finally {
            reader.releaseLock();
          }
        };
        
        processStream();
        
        return () => {
          reader.cancel().catch(console.error);
        };
      }
    }, [aiResponse?.stream]);
  
    if (isLoading) {
      return (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    
    // Show streaming content if available
    if (aiResponse?.stream || streamingContent) {
      return (
        <Card className="border-2 border-primary/20 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Brain className="h-6 w-6 text-primary" />
                </motion.div>
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Analisis Mendalam
                </span>
              </CardTitle>
          </CardHeader>
          <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="space-y-4 text-foreground/90">
                  {streamingContent && (
                    <div className="whitespace-pre-line">
                      {renderFormattedResponse(streamingContent)}
                    </div>
                  )}
                  <motion.div 
                    className="flex flex-col items-center justify-center py-4 space-y-2 mt-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 10, -10, 0]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        ease: "easeInOut"
                      }}
                    >
                      <Zap className="h-5 w-5 text-primary" />
                    </motion.div>
                    <motion.span 
                      className="text-muted-foreground text-xs font-medium"
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      Menganalisis...
                    </motion.span>
                  </motion.div>
                </div>
              </div>
          </CardContent>
        </Card>
      );
    }
  
    const hasError =
      !!error ||
      insights.some((insight) =>
        [
          "gagal",
          "error",
          "tidak dikonfigurasi",
          "tidak ditemukan",
          "tidak lengkap",
        ].some((kw) => insight.toLowerCase().includes(kw))
      );
  
    const hasData = expenses.length > 0;
    const showDefaultMessage = insights.length === 0 ||
      (insights.length === 1 && insights[0].startsWith("Belum Ada Wawasan"));
  
  
    if (showDefaultMessage || hasError) {
      let titleText: string | JSX.Element = hasData
        ? (
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Zap className="h-5 w-5 text-green-500" />
            </motion.div>
            <span>Data Siap Dianalisis</span>
          </div>
          )
        : "Data Kosong";
  
      let descriptionText: string | JSX.Element = hasData
        ? (
          <>
            <p className="mb-2">Kami menemukan <span className="font-semibold">{expenses.length} transaksi</span> yang siap dianalisis.</p>
            <p>Klik tombol <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-md text-sm">
              <Zap className="h-3 w-3" /> Analisa AI
            </span> untuk mendapatkan wawasan tentang pola belanja emosional Anda.</p>
          </>
          )
        : `Tidak ditemukan data pengeluaran untuk ${period === 'week' ? 'minggu ini' : period === 'month' ? 'bulan ini' : 'tahun ini'}. ` +
          `Sistem tidak dapat menganalisis apa pun tanpa data. ` +
          `Silakan tambahkan pengeluaran Anda terlebih dahulu atau pilih periode lain yang memiliki data.`;
  
      if (hasError && insights.length > 0) {
        titleText = "Informasi Wawasan";
        descriptionText = insights.join("\n");
        if (
          error?.toLowerCase().includes("no api keys") ||
          insights.some((i) => i.toLowerCase().includes("tidak dikonfigurasi"))
        ) {
          titleText = "Konfigurasi Diperlukan";
        } else if (error?.toLowerCase().includes("not enough data")) {
          titleText = "Data Tidak Mencukupi";
          descriptionText = "Data pengeluaran Anda belum cukup untuk dianalisis. " +
            "Anda membutuhkan minimal 3 transaksi untuk mendapatkan wawasan yang bermakna. " +
            "Silakan tambahkan lebih banyak pengeluaran dan coba lagi.";
        } else if (hasError) {
          titleText = "Gagal Memproses Permintaan";
          descriptionText = "Terjadi kesalahan saat memproses data Anda. " +
            "Ini bisa terjadi karena masalah koneksi atau masalah teknis. " +
            "Silakan periksa koneksi internet Anda dan coba lagi nanti. " +
            "Jika masalah berlanjut, harap laporkan ke tim dukungan kami.";
        }
      } else if (error) {
        titleText = "Terjadi Kesalahan";
        descriptionText = "Sistem mengalami kendala saat memproses permintaan Anda. " +
          "Ini bisa disebabkan oleh beberapa hal:\n\n" +
          "• Koneksi internet yang tidak stabil\n" +
          "• Masalah pada server\n" +
          "• Format data yang tidak sesuai\n\n" +
          "Silakan periksa koneksi Anda dan coba lagi. Jika masalah berlanjut, " +
          "Anda dapat menghubungi tim dukungan kami untuk bantuan lebih lanjut.";
      }
  
      return (
        <Card className={`border-dashed border-2 ${hasData ? 'border-green-500/30 hover:border-green-500/50' : 'border-destructive/30 hover:border-destructive/50'} transition-colors duration-300`}>
          <div className="absolute -top-2 -right-2">
            <div className="relative">
              <div className={`absolute -inset-1 rounded-full ${hasData ? 'bg-green-500/20' : 'bg-destructive/20'} blur-sm`}></div>
              <div className={`relative flex h-4 w-4 items-center justify-center rounded-full ${hasData ? 'bg-green-500' : 'bg-destructive'}`}>
                {hasData ? (
                  <Lightbulb className="h-2.5 w-2.5 text-white" />
                ) : (
                  <AlertTriangle className="h-2.5 w-2.5 text-white" />
                )}
              </div>
            </div>
          </div>
          <CardHeader>
            <CardTitle>{titleText}</CardTitle>
            <CardDescription className="prose-sm dark:prose-invert">
              {typeof descriptionText === 'string' ? renderFormattedResponse(descriptionText) : descriptionText}
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }
  
    return (
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight, index) => {
          const Icon = icons[index % icons.length];
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="h-full"
            >
              <Card className="h-full flex flex-col border-primary/10 hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </span>
                    <CardTitle className="text-lg">Wawasan AI</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grow flex flex-col">
                  <div className="prose prose-sm dark:prose-invert max-w-none space-y-2">
                    {renderFormattedResponse(insight)}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    );
  }