import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, font } from '../../src/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  focused,
  size = 20,
}: {
  name: IoniconName;
  focused: boolean;
  size?: number;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={size} color={focused ? '#FFFFFF' : colors.g800} />
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.g600,
        tabBarInactiveTintColor: '#BBBBBB',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: t('tabs.scan'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="camera-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="fridge"
        options={{
          title: t('tabs.fridge'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="snow-outline" focused={focused} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: t('tabs.recipes'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="book-outline" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.backgroundCard,
    borderTopColor: colors.g100,
    height: 96,
    paddingTop: 10,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: font.family,
    fontWeight: font.regular,
    marginTop: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.g100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconWrapActive: {
    backgroundColor: colors.g600,
  },
});
