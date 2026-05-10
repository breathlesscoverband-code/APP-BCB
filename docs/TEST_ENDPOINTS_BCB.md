# TEST ENDPOINTS APP-BCB

Endpoint actual:

```text
https://script.google.com/macros/s/AKfycbx6FfjKaqSvRu9Wc8Ym0yH1y-x4VPryt4J4qVM6EOhRDEhGBGr6RrO51xqaUF36mrD6dg/exec
```

## Health

```text
https://script.google.com/macros/s/AKfycbx6FfjKaqSvRu9Wc8Ym0yH1y-x4VPryt4J4qVM6EOhRDEhGBGr6RrO51xqaUF36mrD6dg/exec?action=health
```

Debe devolver `ok: true`, `band: BCB` y el Sheet ID BCB.

## Mobile

```text
https://script.google.com/macros/s/AKfycbx6FfjKaqSvRu9Wc8Ym0yH1y-x4VPryt4J4qVM6EOhRDEhGBGr6RrO51xqaUF36mrD6dg/exec?action=mobile
```

Debe devolver JSON con `data`.

## Sheet concreto

```text
https://script.google.com/macros/s/AKfycbx6FfjKaqSvRu9Wc8Ym0yH1y-x4VPryt4J4qVM6EOhRDEhGBGr6RrO51xqaUF36mrD6dg/exec?action=sheet&tab=REPERTORIO
```

Debe devolver canciones del repertorio BCB.
