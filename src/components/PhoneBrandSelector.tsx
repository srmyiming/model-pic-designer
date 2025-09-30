import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhoneBrand } from '@/types/repair';

interface PhoneBrandSelectorProps {
  value: PhoneBrand | null;
  onChange: (value: PhoneBrand) => void;
}

const BRANDS: { key: PhoneBrand; label: string }[] = [
  { key: 'generic', label: '通用手机' },
  { key: 'apple', label: '苹果手机' },
  { key: 'samsung', label: '三星手机' },
  { key: 'xiaomi', label: '小米手机' },
];

export const PhoneBrandSelector = ({ value, onChange }: PhoneBrandSelectorProps) => {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="mb-3">
          <h3 className="text-base font-semibold">选择手机品牌（必选）</h3>
          <p className="text-xs text-muted-foreground">用于在下一步加载对应的配件图与模板</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {BRANDS.map((b) => (
            <Button
              key={b.key}
              type="button"
              variant={value === b.key ? 'default' : 'outline'}
              className="w-full"
              onClick={() => onChange(b.key)}
            >
              {b.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PhoneBrandSelector;

