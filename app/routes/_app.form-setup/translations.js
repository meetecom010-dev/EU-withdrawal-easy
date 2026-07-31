// Default translated form copy for every non-English language the Languages
// card offers, mirroring the English defaults in
// app/models/app-settings.server.js (labelsSchema + reasonField). When a
// merchant offers a language its tab is prefilled from here — and the public
// API serves this copy to that locale's shoppers — so every language ships a
// complete, professional translation out of the box, not blanks that fall back
// to English.
//
// `reasonOptions` is keyed by the *English* default option text, so a reordered
// or unchanged option list still resolves each option to the right translation
// (see fillTranslationDefaults). A custom English option with no entry here is
// left blank for the merchant to translate.

export const DEFAULT_TRANSLATIONS = {
  de: {
    labels: {
      step1Title: "Ihren Kauf widerrufen",
      step1Description:
        "Sie haben das Recht, diesen Kauf innerhalb von 14 Tagen ohne Angabe von Gründen zu widerrufen.",
      itemSelectionHeading: "Wählen Sie die Artikel aus, die Sie widerrufen möchten",
      deliveredTitle: "Ihre gelieferte Bestellung widerrufen",
      deliveredDescription:
        "Ihre Bestellung wurde geliefert. Sie können Ihren Kauf innerhalb von 14 Tagen nach Lieferung dennoch widerrufen.",
      deliveredItemSelectionHeading:
        "Wählen Sie die gelieferten Artikel aus, die Sie widerrufen möchten",
      confirmHeading: "Bestätigen Sie Ihren Widerruf",
      confirmMessage: "Bitte bestätigen Sie, dass Sie von diesem Kauf widerrufen möchten.",
      deliveredConfirmMessage:
        "Bitte bestätigen Sie, dass Sie von dieser gelieferten Bestellung widerrufen möchten.",
      declaration: "Hiermit widerrufe ich den Vertrag über den Kauf der ausgewählten Artikel.",
      submittedTitle: "Widerrufsantrag eingereicht",
      submittedMessage:
        "Wir haben Ihren Widerrufsantrag erhalten und werden uns in Kürze bei Ihnen melden.",
      deliveredSubmittedTitle: "Rücksendeantrag eingereicht",
      deliveredSubmittedMessage:
        "Wir haben Ihren Rücksendeantrag erhalten und senden Ihnen weitere Anweisungen per E-Mail.",
      step1ButtonLabel: "Weiter",
      confirmButtonLabel: "Widerruf bestätigen",
    },
    reasonLabel: "Grund für die Rücksendung",
    reasonOptions: {
      "Changed my mind": "Meinung geändert",
      "Wrong size": "Falsche Größe",
      "Item arrived damaged": "Artikel beschädigt angekommen",
      "Prefer not to say": "Keine Angabe",
    },
  },
  fr: {
    labels: {
      step1Title: "Rétractation de votre achat",
      step1Description:
        "Vous avez le droit de vous rétracter de cet achat dans un délai de 14 jours sans avoir à motiver votre décision.",
      itemSelectionHeading: "Sélectionnez les articles à rétracter",
      deliveredTitle: "Rétractation de votre commande livrée",
      deliveredDescription:
        "Votre commande a été livrée. Vous pouvez encore vous rétracter de votre achat dans un délai de 14 jours suivant la livraison.",
      deliveredItemSelectionHeading: "Sélectionnez les articles livrés à rétracter",
      confirmHeading: "Confirmez votre rétractation",
      confirmMessage: "Veuillez confirmer que vous souhaitez vous rétracter de cet achat.",
      deliveredConfirmMessage:
        "Veuillez confirmer que vous souhaitez vous rétracter de cette commande livrée.",
      declaration:
        "Je déclare par la présente me rétracter du contrat portant sur l'achat des articles sélectionnés.",
      submittedTitle: "Demande de rétractation envoyée",
      submittedMessage:
        "Nous avons bien reçu votre demande de rétractation et vous recontacterons sous peu.",
      deliveredSubmittedTitle: "Demande de retour envoyée",
      deliveredSubmittedMessage:
        "Nous avons bien reçu votre demande de retour et vous enverrons les instructions par e-mail.",
      step1ButtonLabel: "Continuer",
      confirmButtonLabel: "Confirmer la rétractation",
    },
    reasonLabel: "Motif du retour",
    reasonOptions: {
      "Changed my mind": "J'ai changé d'avis",
      "Wrong size": "Mauvaise taille",
      "Item arrived damaged": "Article arrivé endommagé",
      "Prefer not to say": "Je préfère ne pas répondre",
    },
  },
  nl: {
    labels: {
      step1Title: "Herroep uw aankoop",
      step1Description:
        "U hebt het recht om deze aankoop binnen 14 dagen zonder opgave van redenen te herroepen.",
      itemSelectionHeading: "Selecteer de artikelen die u wilt herroepen",
      deliveredTitle: "Herroep uw geleverde bestelling",
      deliveredDescription:
        "Uw bestelling is geleverd. U kunt uw aankoop nog binnen 14 dagen na levering herroepen.",
      deliveredItemSelectionHeading: "Selecteer de geleverde artikelen die u wilt herroepen",
      confirmHeading: "Bevestig uw herroeping",
      confirmMessage: "Bevestig dat u deze aankoop wilt herroepen.",
      deliveredConfirmMessage: "Bevestig dat u deze geleverde bestelling wilt herroepen.",
      declaration:
        "Hierbij herroep ik de overeenkomst voor de aankoop van de geselecteerde artikelen.",
      submittedTitle: "Herroepingsverzoek ingediend",
      submittedMessage:
        "We hebben uw herroepingsverzoek ontvangen en nemen binnenkort contact met u op.",
      deliveredSubmittedTitle: "Retourverzoek ingediend",
      deliveredSubmittedMessage:
        "We hebben uw retourverzoek ontvangen en sturen u verdere instructies per e-mail.",
      step1ButtonLabel: "Doorgaan",
      confirmButtonLabel: "Herroeping bevestigen",
    },
    reasonLabel: "Reden voor retour",
    reasonOptions: {
      "Changed my mind": "Van gedachten veranderd",
      "Wrong size": "Verkeerde maat",
      "Item arrived damaged": "Artikel beschadigd aangekomen",
      "Prefer not to say": "Zeg ik liever niet",
    },
  },
  it: {
    labels: {
      step1Title: "Recedi dal tuo acquisto",
      step1Description:
        "Hai il diritto di recedere da questo acquisto entro 14 giorni senza fornire alcuna motivazione.",
      itemSelectionHeading: "Seleziona gli articoli da cui vuoi recedere",
      deliveredTitle: "Recedi dal tuo ordine consegnato",
      deliveredDescription:
        "Il tuo ordine è stato consegnato. Puoi comunque recedere dal tuo acquisto entro 14 giorni dalla consegna.",
      deliveredItemSelectionHeading: "Seleziona gli articoli consegnati da cui vuoi recedere",
      confirmHeading: "Conferma il tuo recesso",
      confirmMessage: "Conferma di voler recedere da questo acquisto.",
      deliveredConfirmMessage: "Conferma di voler recedere da questo ordine consegnato.",
      declaration:
        "Con la presente recedo dal contratto di acquisto degli articoli selezionati.",
      submittedTitle: "Richiesta di recesso inviata",
      submittedMessage:
        "Abbiamo ricevuto la tua richiesta di recesso e ti contatteremo a breve.",
      deliveredSubmittedTitle: "Richiesta di reso inviata",
      deliveredSubmittedMessage:
        "Abbiamo ricevuto la tua richiesta di reso e ti invieremo ulteriori istruzioni via e-mail.",
      step1ButtonLabel: "Continua",
      confirmButtonLabel: "Conferma recesso",
    },
    reasonLabel: "Motivo del reso",
    reasonOptions: {
      "Changed my mind": "Ho cambiato idea",
      "Wrong size": "Taglia sbagliata",
      "Item arrived damaged": "Articolo arrivato danneggiato",
      "Prefer not to say": "Preferisco non dirlo",
    },
  },
  es: {
    labels: {
      step1Title: "Desiste de tu compra",
      step1Description:
        "Tienes derecho a desistir de esta compra en un plazo de 14 días sin necesidad de justificación.",
      itemSelectionHeading: "Selecciona los artículos de los que quieres desistir",
      deliveredTitle: "Desiste de tu pedido entregado",
      deliveredDescription:
        "Tu pedido ha sido entregado. Aún puedes desistir de tu compra en un plazo de 14 días desde la entrega.",
      deliveredItemSelectionHeading:
        "Selecciona los artículos entregados de los que quieres desistir",
      confirmHeading: "Confirma tu desistimiento",
      confirmMessage: "Confirma que deseas desistir de esta compra.",
      deliveredConfirmMessage: "Confirma que deseas desistir de este pedido entregado.",
      declaration:
        "Por la presente desisto del contrato de compra de los artículos seleccionados.",
      submittedTitle: "Solicitud de desistimiento enviada",
      submittedMessage:
        "Hemos recibido tu solicitud de desistimiento y nos pondremos en contacto contigo en breve.",
      deliveredSubmittedTitle: "Solicitud de devolución enviada",
      deliveredSubmittedMessage:
        "Hemos recibido tu solicitud de devolución y te enviaremos más instrucciones por correo electrónico.",
      step1ButtonLabel: "Continuar",
      confirmButtonLabel: "Confirmar desistimiento",
    },
    reasonLabel: "Motivo de la devolución",
    reasonOptions: {
      "Changed my mind": "He cambiado de opinión",
      "Wrong size": "Talla incorrecta",
      "Item arrived damaged": "El artículo llegó dañado",
      "Prefer not to say": "Prefiero no decirlo",
    },
  },
  pl: {
    labels: {
      step1Title: "Odstąp od zakupu",
      step1Description:
        "Masz prawo odstąpić od tego zakupu w ciągu 14 dni bez podawania przyczyny.",
      itemSelectionHeading: "Wybierz produkty, od których chcesz odstąpić",
      deliveredTitle: "Odstąp od dostarczonego zamówienia",
      deliveredDescription:
        "Twoje zamówienie zostało dostarczone. Nadal możesz odstąpić od zakupu w ciągu 14 dni od dostawy.",
      deliveredItemSelectionHeading:
        "Wybierz dostarczone produkty, od których chcesz odstąpić",
      confirmHeading: "Potwierdź odstąpienie",
      confirmMessage: "Potwierdź, że chcesz odstąpić od tego zakupu.",
      deliveredConfirmMessage: "Potwierdź, że chcesz odstąpić od tego dostarczonego zamówienia.",
      declaration: "Niniejszym odstępuję od umowy zakupu wybranych produktów.",
      submittedTitle: "Wniosek o odstąpienie został wysłany",
      submittedMessage:
        "Otrzymaliśmy Twój wniosek o odstąpienie i wkrótce się z Tobą skontaktujemy.",
      deliveredSubmittedTitle: "Wniosek o zwrot został wysłany",
      deliveredSubmittedMessage:
        "Otrzymaliśmy Twój wniosek o zwrot i wyślemy dalsze instrukcje e-mailem.",
      step1ButtonLabel: "Dalej",
      confirmButtonLabel: "Potwierdź odstąpienie",
    },
    reasonLabel: "Powód zwrotu",
    reasonOptions: {
      "Changed my mind": "Zmiana zdania",
      "Wrong size": "Nieprawidłowy rozmiar",
      "Item arrived damaged": "Produkt dotarł uszkodzony",
      "Prefer not to say": "Wolę nie podawać",
    },
  },
  sv: {
    labels: {
      step1Title: "Ångra ditt köp",
      step1Description:
        "Du har rätt att ångra detta köp inom 14 dagar utan att ange något skäl.",
      itemSelectionHeading: "Välj de artiklar du vill ångra",
      deliveredTitle: "Ångra din levererade beställning",
      deliveredDescription:
        "Din beställning har levererats. Du kan fortfarande ångra ditt köp inom 14 dagar från leveransen.",
      deliveredItemSelectionHeading: "Välj de levererade artiklar du vill ångra",
      confirmHeading: "Bekräfta din ångerbegäran",
      confirmMessage: "Bekräfta att du vill ångra detta köp.",
      deliveredConfirmMessage: "Bekräfta att du vill ångra denna levererade beställning.",
      declaration: "Jag frånträder härmed avtalet om köp av de valda artiklarna.",
      submittedTitle: "Ångerbegäran skickad",
      submittedMessage: "Vi har tagit emot din ångerbegäran och återkommer inom kort.",
      deliveredSubmittedTitle: "Returbegäran skickad",
      deliveredSubmittedMessage:
        "Vi har tagit emot din returbegäran och skickar ytterligare instruktioner via e-post.",
      step1ButtonLabel: "Fortsätt",
      confirmButtonLabel: "Bekräfta ångerbegäran",
    },
    reasonLabel: "Anledning till retur",
    reasonOptions: {
      "Changed my mind": "Ångrade mig",
      "Wrong size": "Fel storlek",
      "Item arrived damaged": "Artikeln kom skadad",
      "Prefer not to say": "Vill inte uppge",
    },
  },
};

function nonBlank(value) {
  return typeof value === "string" && value.trim() !== "";
}

// Builds a complete translation for one language: the merchant's own value wins
// wherever it's non-blank, otherwise the default translation fills in. Used both
// to prefill a newly added language (existing = undefined) and to top up any
// blanks on read (existing = the stored translation). Reason options are matched
// to the English option text so a reordered list still lands on the right words;
// a custom option with no default is left blank for the merchant to translate.
export function fillTranslationDefaults(lang, englishLabels, englishOptions, existing) {
  const defaults = DEFAULT_TRANSLATIONS[lang];
  const cur = existing ?? {};
  const curLabels = cur.labels ?? {};
  const curOptions = cur.reasonOptions ?? [];

  if (!defaults) {
    // No catalog for this language — keep whatever the merchant has, normalised.
    return {
      labels: { ...curLabels },
      reasonLabel: cur.reasonLabel ?? "",
      reasonOptions: (englishOptions ?? []).map((_, i) => curOptions[i] ?? ""),
    };
  }

  const labels = {};
  for (const key of Object.keys(englishLabels ?? {})) {
    labels[key] = nonBlank(curLabels[key]) ? curLabels[key] : defaults.labels[key] ?? "";
  }

  const reasonLabel = nonBlank(cur.reasonLabel) ? cur.reasonLabel : defaults.reasonLabel ?? "";

  const reasonOptions = (englishOptions ?? []).map((option, i) =>
    nonBlank(curOptions[i]) ? curOptions[i] : defaults.reasonOptions[option] ?? "",
  );

  return { labels, reasonLabel, reasonOptions };
}
