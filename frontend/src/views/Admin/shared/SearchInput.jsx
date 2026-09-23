import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export default function SearchInput({ value, onChange, placeholder = 'Buscar...', width = 260 }) {
  return (
    <Input
      allowClear
      prefix={<SearchOutlined />}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width, maxWidth: '100%' }}
    />
  );
}
