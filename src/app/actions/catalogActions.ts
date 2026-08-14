'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createCatalogProduct, linkCompetitorOffer, setProductMarket } from '@/lib/catalog'
import { runPriceCheck } from '@/lib/price-monitoring'

export type CatalogActionState = {
  ok: boolean
  message: string
}

const emptyToUndefined = (value: unknown) => value === '' ? undefined : value
const optionalNumber = z.preprocess(emptyToUndefined, z.coerce.number().nonnegative().optional())
const optionalPositiveInt = z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional())
const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional())
const optionalCurrency = z.preprocess(
  emptyToUndefined,
  z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
)

const productFormSchema = z.object({
  articleNumber: z.string().trim().min(1, 'Artikelnummer is verplicht.'),
  ean: optionalText,
  name: z.string().trim().min(1, 'Productnaam is verplicht.'),
  productGroupId: z.string().min(1, 'Productgroep is verplicht.'),
  ownPrice: optionalNumber,
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  stockStatus: optionalText,
  packagingUnit: optionalText,
  packagingQty: optionalPositiveInt,
  countryIds: z.array(z.string().min(1)).min(1, 'Selecteer minimaal één land.'),
})

const marketFormSchema = z.object({
  countryId: z.string().min(1, 'Land is verplicht.'),
  ownPrice: optionalNumber,
  currency: optionalCurrency,
  ownUrl: z.preprocess(emptyToUndefined, z.string().url('Vul een geldige product URL in.').optional()),
  stockStatus: optionalText,
})

const competitorFormSchema = z.object({
  countryId: z.string().min(1, 'Land is verplicht.'),
  competitorName: z.string().trim().min(1, 'Naam van de concurrent is verplicht.'),
  competitorWebsite: z.string().url('Vul een geldige website in.'),
  offerUrl: z.string().url('Vul een geldige product URL in.'),
  checkFrequencyHours: optionalPositiveInt,
  currency: optionalCurrency,
  packagingUnit: optionalText,
  packagingQty: optionalPositiveInt,
})

function failure(error: unknown): CatalogActionState {
  if (error instanceof z.ZodError) {
    return { ok: false, message: error.issues[0]?.message ?? 'Controleer de invoer.' }
  }
  const value = error as { code?: string; message?: string }
  if (value?.code === 'P2002') {
    return { ok: false, message: 'Deze invoer bestaat al. Controleer artikelnummer, concurrent en URL.' }
  }
  return { ok: false, message: error instanceof Error ? error.message : 'Opslaan mislukt.' }
}

export async function createProductAction(_previousState: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  let productId: string
  try {
    const parsed = productFormSchema.parse({
      articleNumber: formData.get('articleNumber'),
      ean: formData.get('ean'),
      name: formData.get('name'),
      productGroupId: formData.get('productGroupId'),
      ownPrice: formData.get('ownPrice'),
      currency: formData.get('currency'),
      stockStatus: formData.get('stockStatus'),
      packagingUnit: formData.get('packagingUnit'),
      packagingQty: formData.get('packagingQty'),
      countryIds: formData.getAll('countryIds'),
    })
    const product = await createCatalogProduct(parsed)
    productId = product.id
  } catch (error) {
    return failure(error)
  }

  revalidatePath('/producten')
  redirect(`/producten/${productId}`)
}

export async function setProductMarketAction(productId: string, _previousState: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  try {
    const parsed = marketFormSchema.parse({
      countryId: formData.get('countryId'),
      ownPrice: formData.get('ownPrice'),
      currency: formData.get('currency'),
      ownUrl: formData.get('ownUrl'),
      stockStatus: formData.get('stockStatus'),
    })
    await setProductMarket({ productId, ...parsed })
    revalidatePath('/producten')
    revalidatePath(`/producten/${productId}`)
    return { ok: true, message: 'Landinstellingen opgeslagen.' }
  } catch (error) {
    return failure(error)
  }
}

export async function addCompetitorOfferAction(productId: string, _previousState: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  try {
    const parsed = competitorFormSchema.parse({
      countryId: formData.get('countryId'),
      competitorName: formData.get('competitorName'),
      competitorWebsite: formData.get('competitorWebsite'),
      offerUrl: formData.get('offerUrl'),
      checkFrequencyHours: formData.get('checkFrequencyHours'),
      currency: formData.get('currency'),
      packagingUnit: formData.get('packagingUnit'),
      packagingQty: formData.get('packagingQty'),
    })
    const linked = await linkCompetitorOffer({ productId, ...parsed })
    revalidatePath('/concurrenten')
    revalidatePath(`/producten/${productId}`)
    return linked.initialCheck.success
      ? { ok: true, message: 'Concurrent gekoppeld en eerste prijs succesvol gecontroleerd.' }
      : { ok: true, message: `Concurrent gekoppeld. De eerste controle gaf: ${linked.initialCheck.error ?? 'geen prijs gevonden'}` }
  } catch (error) {
    return failure(error)
  }
}

export async function runPriceCheckAction(offerId: string, productId: string, _formData: FormData) {
  void _formData
  await runPriceCheck(offerId)
  revalidatePath('/dashboard')
  revalidatePath('/concurrenten')
  revalidatePath(`/producten/${productId}`)
}
