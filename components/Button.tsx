import { forwardRef } from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';

type ButtonProps = {
  title: string;
} & TouchableOpacityProps;

export const Button = forwardRef<View, ButtonProps>(({ title, ...touchableProps }, ref) => {
  return (
    <TouchableOpacity
      ref={ref}
      {...touchableProps}
      className={`items-center rounded-[28px] bg-indigo-500 p-4 shadow-md ${touchableProps.className || ''}`}>
      <Text className="text-center text-lg font-semibold text-white">{title}</Text>
    </TouchableOpacity>
  );
});

Button.displayName = 'Button';
