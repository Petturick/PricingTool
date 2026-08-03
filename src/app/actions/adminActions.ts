'use server'

import bcrypt from 'bcryptjs'
import { Prisma } from '@/generated/prisma'
import { createAuditLog, getSystemUser } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { competitorSchema, countrySchema, productGroupSchema, userSchema, webshopSchema } from '@/lib/validators'
import { revalidatePath } from 'next/cache'

async function audit(action: string, entityType: string, entityId: string, oldValue?: Prisma.InputJsonValue | null, newValue?: Prisma.InputJsonValue | null) {
  const systemUser = await getSystemUser()
  await createAuditLog({ userId: systemUser.id, action, entityType, entityId, oldValue, newValue })
}

export async function saveCountryAction(formData: FormData) {
  const parsed = countrySchema.parse({
    id: formData.get('id') || undefined,
    code: formData.get('code'),
    name: formData.get('name'),
    vatRate: formData.get('vatRate'),
    currency: formData.get('currency'),
    isActive: formData.get('isActive') === 'on',
  })

  const result = await prisma.country.upsert({
    where: { code: parsed.code },
    update: { name: parsed.name, vatRate: new Prisma.Decimal(parsed.vatRate), currency: parsed.currency, isActive: parsed.isActive },
    create: { code: parsed.code, name: parsed.name, vatRate: new Prisma.Decimal(parsed.vatRate), currency: parsed.currency, isActive: parsed.isActive },
  })

  await audit('COUNTRY_SAVED', 'Country', result.id, null, { code: result.code, name: result.name })
  revalidatePath('/beheer/landen')
  revalidatePath('/beheer')
}

export async function deleteCountryAction(formData: FormData) {
  const id = String(formData.get('id'))
  await prisma.country.delete({ where: { id } })
  await audit('COUNTRY_DELETED', 'Country', id)
  revalidatePath('/beheer/landen')
}

export async function saveCompetitorAdminAction(formData: FormData) {
  const parsed = competitorSchema.parse({
    name: formData.get('name'),
    website: formData.get('website'),
    countryId: formData.get('countryId'),
    checkFrequencyHours: formData.get('checkFrequencyHours'),
    isActive: formData.get('isActive') === 'on',
  })
  const id = formData.get('id') ? String(formData.get('id')) : undefined
  const result = id
    ? await prisma.competitor.update({ where: { id }, data: parsed })
    : await prisma.competitor.create({ data: parsed })
  await audit('COMPETITOR_SAVED', 'Competitor', result.id, null, { name: result.name })
  revalidatePath('/beheer/concurrenten')
  revalidatePath('/concurrenten')
}

export async function deleteCompetitorAdminAction(formData: FormData) {
  const id = String(formData.get('id'))
  await prisma.competitor.delete({ where: { id } })
  await audit('COMPETITOR_DELETED', 'Competitor', id)
  revalidatePath('/beheer/concurrenten')
}

export async function saveWebshopAction(formData: FormData) {
  const parsed = webshopSchema.parse({
    id: formData.get('id') || undefined,
    name: formData.get('name'),
    url: formData.get('url'),
    countryId: formData.get('countryId'),
    competitorId: formData.get('competitorId') || null,
    isActive: formData.get('isActive') === 'on',
  })
  const result = parsed.id
    ? await prisma.webshop.update({ where: { id: parsed.id }, data: parsed })
    : await prisma.webshop.create({ data: parsed })
  await audit('WEBSHOP_SAVED', 'Webshop', result.id, null, { name: result.name })
  revalidatePath('/beheer/webshops')
}

export async function deleteWebshopAction(formData: FormData) {
  const id = String(formData.get('id'))
  await prisma.webshop.delete({ where: { id } })
  await audit('WEBSHOP_DELETED', 'Webshop', id)
  revalidatePath('/beheer/webshops')
}

export async function saveProductGroupAction(formData: FormData) {
  const parsed = productGroupSchema.parse({
    id: formData.get('id') || undefined,
    name: formData.get('name'),
    description: formData.get('description') || '',
    isActive: formData.get('isActive') === 'on',
  })
  const result = parsed.id
    ? await prisma.productGroup.update({ where: { id: parsed.id }, data: parsed })
    : await prisma.productGroup.create({ data: parsed })
  await audit('PRODUCT_GROUP_SAVED', 'ProductGroup', result.id, null, { name: result.name })
  revalidatePath('/beheer/productgroepen')
  revalidatePath('/beheer')
}

export async function deleteProductGroupAction(formData: FormData) {
  const id = String(formData.get('id'))
  await prisma.productGroup.delete({ where: { id } })
  await audit('PRODUCT_GROUP_DELETED', 'ProductGroup', id)
  revalidatePath('/beheer/productgroepen')
}

export async function saveUserAction(formData: FormData) {
  const parsed = userSchema.parse({
    id: formData.get('id') || undefined,
    email: formData.get('email'),
    name: formData.get('name'),
    password: formData.get('password'),
    role: formData.get('role'),
  })

  const passwordHash = await bcrypt.hash(parsed.password, 10)
  const result = parsed.id
    ? await prisma.user.update({ where: { id: parsed.id }, data: { email: parsed.email, name: parsed.name, passwordHash, role: parsed.role } })
    : await prisma.user.create({ data: { email: parsed.email, name: parsed.name, passwordHash, role: parsed.role } })
  await audit('USER_SAVED', 'User', result.id, null, { email: result.email, role: result.role })
  revalidatePath('/beheer/gebruikers')
}

export async function deleteUserAction(formData: FormData) {
  const id = String(formData.get('id'))
  await prisma.user.delete({ where: { id } })
  await audit('USER_DELETED', 'User', id)
  revalidatePath('/beheer/gebruikers')
}
