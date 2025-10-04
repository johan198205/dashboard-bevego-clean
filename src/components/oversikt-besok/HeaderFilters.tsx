'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, RotateCcw } from 'lucide-react';
import dayjs from 'dayjs';

type SearchParams = {
  start?: string;
  end?: string;
  compare?: string;
  channel?: string;
  device?: string;
  role?: string;
  unit?: string;
};

type Props = {
  searchParams: SearchParams;
  onFiltersChange: (filters: Partial<SearchParams>) => void;
  disabled?: boolean;
};

const CHANNEL_OPTIONS = [
  { value: 'Alla', label: 'Alla kanaler' },
  { value: 'Organic Search', label: 'Organisk sökning' },
  { value: 'Direct', label: 'Direkt' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Social', label: 'Social' },
  { value: 'Email', label: 'E-post' },
  { value: 'Paid Search', label: 'Betald sökning' },
  { value: 'Display', label: 'Display' },
  { value: 'Other', label: 'Övrigt' },
];

const DEVICE_OPTIONS = [
  { value: 'Alla', label: 'Alla enheter' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobil' },
  { value: 'tablet', label: 'Surfplatta' },
];

const ROLE_OPTIONS = [
  { value: 'Alla', label: 'Alla roller' },
  { value: 'Boende', label: 'Boende' },
  { value: 'Brf-styrelse', label: 'BRF-styrelse' },
  { value: 'Leverantör', label: 'Leverantör' },
  { value: 'Intern', label: 'Intern' },
];

const COMPARE_OPTIONS = [
  { value: 'yoy', label: 'Jämför med föregående år' },
  { value: 'none', label: 'Ingen jämförelse' },
];

const PRESET_RANGES = [
  { 
    label: 'Senaste 7 dagarna', 
    getRange: () => ({
      start: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
      end: dayjs().format('YYYY-MM-DD')
    })
  },
  { 
    label: 'Senaste 30 dagarna', 
    getRange: () => ({
      start: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      end: dayjs().format('YYYY-MM-DD')
    })
  },
  { 
    label: 'Senaste 3 månaderna', 
    getRange: () => ({
      start: dayjs().subtract(3, 'month').format('YYYY-MM-DD'),
      end: dayjs().format('YYYY-MM-DD')
    })
  },
  { 
    label: 'Senaste 12 månaderna', 
    getRange: () => ({
      start: dayjs().subtract(12, 'month').format('YYYY-MM-DD'),
      end: dayjs().format('YYYY-MM-DD')
    })
  },
];

export function HeaderFilters({ searchParams, onFiltersChange, disabled = false }: Props) {
  const [localStart, setLocalStart] = useState(searchParams.start || '');
  const [localEnd, setLocalEnd] = useState(searchParams.end || '');
  const [localCompare, setLocalCompare] = useState(searchParams.compare || 'yoy');
  const [localChannel, setLocalChannel] = useState(searchParams.channel || 'Alla');
  const [localDevice, setLocalDevice] = useState(searchParams.device || 'Alla');
  const [localRole, setLocalRole] = useState(searchParams.role || 'Alla');

  const handleDateRangeChange = (start: string, end: string) => {
    setLocalStart(start);
    setLocalEnd(end);
  };

  const handlePresetRange = (preset: typeof PRESET_RANGES[0]) => {
    const range = preset.getRange();
    setLocalStart(range.start);
    setLocalEnd(range.end);
  };

  const handleApply = () => {
    onFiltersChange({
      start: localStart,
      end: localEnd,
      compare: localCompare,
      channel: localChannel === 'Alla' ? undefined : localChannel,
      device: localDevice === 'Alla' ? undefined : localDevice,
      role: localRole === 'Alla' ? undefined : localRole,
    });
  };

  const handleReset = () => {
    const defaultRange = {
      start: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
      end: dayjs().format('YYYY-MM-DD'),
    };
    setLocalStart(defaultRange.start);
    setLocalEnd(defaultRange.end);
    setLocalCompare('yoy');
    setLocalChannel('Alla');
    setLocalDevice('Alla');
    setLocalRole('Alla');
    onFiltersChange({
      start: defaultRange.start,
      end: defaultRange.end,
      compare: 'yoy',
      channel: undefined,
      device: undefined,
      role: undefined,
      unit: undefined,
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Datumintervall:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={localStart}
                onChange={(e) => handleDateRangeChange(e.target.value, localEnd)}
                disabled={disabled}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <span className="text-gray-500">till</span>
              <input
                type="date"
                value={localEnd}
                onChange={(e) => handleDateRangeChange(localStart, e.target.value)}
                disabled={disabled}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Preset Ranges */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">eller</span>
            <div className="flex gap-1">
              {PRESET_RANGES.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetRange(preset)}
                  disabled={disabled}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Comparison */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Jämförelse:
            </span>
            <Select
              value={localCompare}
              onValueChange={(value) => setLocalCompare(value)}
              disabled={disabled}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPARE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Channel Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Kanal:
            </span>
            <Select
              value={localChannel}
              onValueChange={(value) => setLocalChannel(value)}
              disabled={disabled}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Device Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enhet:
            </span>
            <Select
              value={localDevice}
              onValueChange={(value) => setLocalDevice(value)}
              disabled={disabled}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEVICE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Roll:
            </span>
            <Select
              value={localRole}
              onValueChange={(value) => setLocalRole(value)}
              disabled={disabled}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={disabled}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Återställ
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
