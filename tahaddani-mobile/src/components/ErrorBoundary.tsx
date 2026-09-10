import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, radii, spacing } from '../theme/tokens';
import { strings } from '../i18n';
import { logger } from '../lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Keeps a render error in one subtree from blanking the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('Render error caught by boundary', error, { componentStack: info.componentStack });
  }

  private readonly reset = (): void => {
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.message}>{strings.common.error}</Text>
        <Pressable
          style={styles.button}
          onPress={this.reset}
          accessibilityRole="button"
          accessibilityLabel={strings.common.retry}
        >
          <Text style={styles.buttonLabel}>{strings.common.retry}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  message: {
    color: colors.navy,
    fontSize: 16,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.cyan,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonLabel: {
    color: colors.navy,
    fontSize: 16,
    fontFamily: fontFamily.black,
  },
});
