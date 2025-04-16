;; Property Verification Contract
;; Validates ownership and condition of commercial properties

(define-data-var contract-owner principal tx-sender)

;; Property data structure
(define-map properties
  { property-id: (string-ascii 36) }
  {
    owner: principal,
    address: (string-ascii 100),
    condition: (string-ascii 50),
    last-inspection: uint,
    verified: bool
  }
)

;; Register a new property
(define-public (register-property (property-id (string-ascii 36)) (address (string-ascii 100)))
  (let
    ((caller tx-sender))
    (begin
      (asserts! (is-eq caller (var-get contract-owner)) (err u100))
      (asserts! (is-none (map-get? properties { property-id: property-id })) (err u101))
      (ok (map-set properties
        { property-id: property-id }
        {
          owner: caller,
          address: address,
          condition: "unverified",
          last-inspection: block-height,
          verified: false
        }
      ))
    )
  )
)

;; Transfer property ownership
(define-public (transfer-ownership (property-id (string-ascii 36)) (new-owner principal))
  (let
    ((caller tx-sender)
     (property (unwrap! (map-get? properties { property-id: property-id }) (err u102))))
    (begin
      (asserts! (is-eq caller (get owner property)) (err u103))
      (ok (map-set properties
        { property-id: property-id }
        (merge property { owner: new-owner })
      ))
    )
  )
)

;; Update property condition
(define-public (update-condition (property-id (string-ascii 36)) (new-condition (string-ascii 50)))
  (let
    ((caller tx-sender)
     (property (unwrap! (map-get? properties { property-id: property-id }) (err u102))))
    (begin
      (asserts! (is-eq caller (var-get contract-owner)) (err u104))
      (ok (map-set properties
        { property-id: property-id }
        (merge property {
          condition: new-condition,
          last-inspection: block-height,
          verified: true
        })
      ))
    )
  )
)

;; Check if property is verified
(define-read-only (is-property-verified (property-id (string-ascii 36)))
  (match (map-get? properties { property-id: property-id })
    property (ok (get verified property))
    (err u102)
  )
)

;; Get property details
(define-read-only (get-property (property-id (string-ascii 36)))
  (map-get? properties { property-id: property-id })
)
