import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { userAPI } from '../services/api';

interface CollectorStatsScreenProps {
  route: any;
  navigation: any;
}

interface CollectorStats {
  user_id: string;
  email: string;
  role: string;
  total_collected: number;
  total_payments_count: number;
  this_week_collected: number;
  this_week_payments_count: number;
  last_week_collected: number;
  last_week_payments_count: number;
  week_change_percent: number;
  this_month_collected: number;
  this_month_payments_count: number;
  last_month_collected: number;
  last_month_payments_count: number;
  month_change_percent: number;
  daily_stats: Array<{ date: string; amount: number }>;
  monthly_stats: Array<{ month: string; amount: number }>;
}

const screenWidth = Dimensions.get('window').width;

export default function CollectorStatsScreen({ route, navigation }: CollectorStatsScreenProps) {
  const { userId, userName } = route.params;
  const [stats, setStats] = useState<CollectorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      console.log('📊 Fetching stats for user:', userId);
      const data = await userAPI.getCollectorStats(userId);
      console.log('✅ Stats loaded:', data);
      setStats(data);
    } catch (error: any) {
      console.error('❌ Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderChangeIndicator = (percent: number) => {
    if (percent === 0) {
      return <Text style={styles.changeNeutral}>No change</Text>;
    }

    const isPositive = percent > 0;
    return (
      <View style={styles.changeContainer}>
        <Text style={isPositive ? styles.changePositive : styles.changeNegative}>
          {isPositive ? '↑' : '↓'} {Math.abs(percent).toFixed(1)}%
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Collector Stats</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Collector Stats</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  // Prepare chart data - Daily (last 30 days)
  const dailyLabels = stats.daily_stats.map((d, i) => {
    // Show label every 5 days to avoid crowding
    if (i % 5 === 0) {
      const date = new Date(d.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }
    return '';
  });
  const dailyData = stats.daily_stats.map(d => d.amount);

  // Prepare chart data - Monthly (last 6 months)
  const monthlyLabels = stats.monthly_stats.map(m => {
    const [year, month] = m.month.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(month) - 1];
  });
  const monthlyData = stats.monthly_stats.map(m => m.amount);

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#2563EB',
    },
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Collector Stats</Text>
        <Text style={styles.subtitle}>{userName || stats.email}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Summary Cards */}
        <View style={styles.summarySection}>
          {/* Total Collected Card */}
          <View style={[styles.summaryCard, styles.summaryCardFull]}>
            <Text style={styles.summaryLabel}>Total Collected (All Time)</Text>
            <Text style={styles.summaryValueLarge}>{formatCurrency(stats.total_collected)}</Text>
            <Text style={styles.summarySubtext}>{stats.total_payments_count} payments</Text>
          </View>

          {/* This Week Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Week</Text>
            <Text style={styles.summaryValue}>{formatCurrency(stats.this_week_collected)}</Text>
            <Text style={styles.summarySubtext}>{stats.this_week_payments_count} payments</Text>
            {renderChangeIndicator(stats.week_change_percent)}
          </View>

          {/* This Month Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryValue}>{formatCurrency(stats.this_month_collected)}</Text>
            <Text style={styles.summarySubtext}>{stats.this_month_payments_count} payments</Text>
            {renderChangeIndicator(stats.month_change_percent)}
          </View>
        </View>

        {/* Daily Chart (Last 30 Days) */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Daily Collections (Last 30 Days)</Text>
          {dailyData.every(v => v === 0) ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No payments in the last 30 days</Text>
            </View>
          ) : (
            <LineChart
              data={{
                labels: dailyLabels,
                datasets: [{ data: dailyData.length > 0 ? dailyData : [0] }],
              }}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              fromZero
            />
          )}
        </View>

        {/* Monthly Chart (Last 6 Months) */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Monthly Collections (Last 6 Months)</Text>
          {monthlyData.every(v => v === 0) ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No payments in the last 6 months</Text>
            </View>
          ) : (
            <BarChart
              data={{
                labels: monthlyLabels,
                datasets: [{ data: monthlyData.length > 0 ? monthlyData : [0] }],
              }}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              fromZero
              yAxisSuffix=""
              showValuesOnTopOfBars
            />
          )}
        </View>

        {/* Comparison Section */}
        <View style={styles.comparisonSection}>
          <Text style={styles.comparisonTitle}>Week vs Week Comparison</Text>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>This Week:</Text>
            <Text style={styles.comparisonValue}>{formatCurrency(stats.this_week_collected)}</Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Last Week:</Text>
            <Text style={styles.comparisonValue}>{formatCurrency(stats.last_week_collected)}</Text>
          </View>

          <Text style={[styles.comparisonTitle, { marginTop: 20 }]}>Month vs Month Comparison</Text>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>This Month:</Text>
            <Text style={styles.comparisonValue}>{formatCurrency(stats.this_month_collected)}</Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Last Month:</Text>
            <Text style={styles.comparisonValue}>{formatCurrency(stats.last_month_collected)}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#2563EB',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#DBEAFE',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  summarySection: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: (screenWidth - 48) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryCardFull: {
    width: screenWidth - 32,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  summaryValueLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  changeContainer: {
    marginTop: 8,
  },
  changePositive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  changeNegative: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  changeNeutral: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  chartSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  noDataContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  comparisonSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  comparisonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});
