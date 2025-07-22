import type { Ref } from 'react'

import { useCompatTable } from '../lib/store'
import styles from '../styles/components/PlatformRow.module.css'

import { iconMap } from './Icon'

function CompatTablePlatformRow({
  ref,
  children,
  ...props
}: {
  ref?: Ref<HTMLTableRowElement>
  children?: React.ReactNode
}) {
  const { platforms, browsers, browserInfo } = useCompatTable()

  const platformsWithBrowsers = platforms.map((platform) => ({
    platform,
    browsers: browsers.filter(
      (browser) => browserInfo[browser].type === platform,
    ),
  }))

  if (children) {
    return (
      <tr ref={ref} className={styles['platform-row']} {...props}>
        {children}
      </tr>
    )
  }

  return (
    <tr ref={ref} className={styles['platform-row']} {...props}>
      <td className={styles['platform-spacer']}></td>
      {platformsWithBrowsers.map(({ platform, browsers: platformBrowsers }) => (
        <th
          key={platform}
          className={styles['platform-cell']}
          colSpan={platformBrowsers.length}
          scope="colgroup"
          data-platform={platform}
        >
          <img src={iconMap[platform]} alt={platform} className={styles.icon} />
        </th>
      ))}
    </tr>
  )
}

export { CompatTablePlatformRow }
