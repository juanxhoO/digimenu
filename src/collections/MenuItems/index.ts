import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { posWebhook } from '@/endpoints/pos'


export const MenuItems: CollectionConfig = {
  slug: 'menu-items',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  // This config controls what's populated by default when a post is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'posts'>
  endpoints:[posWebhook],
  admin: {
    defaultColumns: ['name', 'basePrice', 'posItemId', 'tenant'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'menu-items',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'menu-items',
        req,
      }),
    useAsTitle: 'title',
  },
   fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'basePrice',
      type: 'number',
      required: true,
      min: 0,
      admin: { description: 'Default price. Can be overridden per location.' },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'posItemId',
      type: 'text',
      index: true,
      admin: { description: 'The item ID in the external POS system. Used for sync.' },
    },
    {
      name: 'available',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'priceOverrides',
      type: 'array',
      admin: { description: 'Override the base price for specific locations.' },
      fields: [
        {
          name: 'location',
          type: 'relationship',
          relationTo: 'locations',
          required: true,
        },
        {
          name: 'price',
          type: 'number',
          required: true,
          min: 0,
        },
      ],
    },
    {
      name: 'allergens',
      type: 'select',
      hasMany: true,
      options: ['gluten', 'dairy', 'nuts', 'shellfish', 'eggs', 'soy'],
    },
    {
      name: 'dietaryTags',
      type: 'select',
      hasMany: true,
      options: ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher'],
    },
  ],
}
