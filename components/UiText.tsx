/**
 * App Text / TextInput — always LINE Seed Sans once fonts are loaded.
 */
import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextProps,
  type TextInputProps,
} from 'react-native';

import { isLineSeedActive, withLineSeedStyle } from '../utils/fonts';

type TextRef = React.ElementRef<typeof RNText>;
type TextInputRef = React.ElementRef<typeof RNTextInput>;

export const Text = React.forwardRef<TextRef, TextProps>(function Text(
  { style, ...rest },
  ref,
) {
  return (
    <RNText
      ref={ref}
      {...rest}
      style={isLineSeedActive() ? withLineSeedStyle(style) : style}
    />
  );
});

export const TextInput = React.forwardRef<TextInputRef, TextInputProps>(
  function TextInput({ style, ...rest }, ref) {
    return (
      <RNTextInput
        ref={ref}
        {...rest}
        style={isLineSeedActive() ? withLineSeedStyle(style) : style}
      />
    );
  },
);
