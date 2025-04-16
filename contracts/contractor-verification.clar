;; Contractor Verification Contract
;; Validates qualified service providers

(define-data-var contract-owner principal tx-sender)

;; Contractor data structure
(define-map contractors
  { contractor-id: (string-ascii 36) }
  {
    name: (string-ascii 100),
    address: principal,
    specialties: (list 10 (string-ascii 50)),
    license-number: (string-ascii 50),
    insurance-verified: bool,
    rating: uint,
    verified: bool
  }
)

;; Project assignments
(define-map contractor-projects
  { contractor-id: (string-ascii 36), project-id: (string-ascii 36) }
  {
    assigned: bool,
    completed: bool,
    performance-rating: uint
  }
)

;; Register a new contractor
(define-public (register-contractor
    (contractor-id (string-ascii 36))
    (name (string-ascii 100))
    (specialties (list 10 (string-ascii 50)))
    (license-number (string-ascii 50)))
  (let
    ((caller tx-sender))
    (begin
      (asserts! (is-none (map-get? contractors { contractor-id: contractor-id })) (err u301))
      (ok (map-set contractors
        { contractor-id: contractor-id }
        {
          name: name,
          address: caller,
          specialties: specialties,
          license-number: license-number,
          insurance-verified: false,
          rating: u0,
          verified: false
        }
      ))
    )
  )
)

;; Verify contractor (contract owner only)
(define-public (verify-contractor (contractor-id (string-ascii 36)) (insurance-verified bool))
  (let
    ((caller tx-sender)
     (contractor (unwrap! (map-get? contractors { contractor-id: contractor-id }) (err u302))))
    (begin
      (asserts! (is-eq caller (var-get contract-owner)) (err u303))
      (ok (map-set contractors
        { contractor-id: contractor-id }
        (merge contractor {
          insurance-verified: insurance-verified,
          verified: true
        })
      ))
    )
  )
)

;; Assign contractor to project
(define-public (assign-contractor (contractor-id (string-ascii 36)) (project-id (string-ascii 36)))
  (let
    ((caller tx-sender)
     (contractor (unwrap! (map-get? contractors { contractor-id: contractor-id }) (err u302))))
    (begin
      (asserts! (get verified contractor) (err u304))
      (asserts! (is-none (map-get? contractor-projects { contractor-id: contractor-id, project-id: project-id })) (err u305))
      (ok (map-set contractor-projects
        { contractor-id: contractor-id, project-id: project-id }
        {
          assigned: true,
          completed: false,
          performance-rating: u0
        }
      ))
    )
  )
)

;; Mark project as completed and rate contractor
(define-public (complete-project (contractor-id (string-ascii 36)) (project-id (string-ascii 36)) (rating uint))
  (let
    ((caller tx-sender)
     (assignment (unwrap! (map-get? contractor-projects { contractor-id: contractor-id, project-id: project-id }) (err u306)))
     (contractor (unwrap! (map-get? contractors { contractor-id: contractor-id }) (err u302))))
    (begin
      (asserts! (get assigned assignment) (err u307))
      (asserts! (not (get completed assignment)) (err u308))
      (asserts! (<= rating u5) (err u309))

      ;; Update assignment
      (map-set contractor-projects
        { contractor-id: contractor-id, project-id: project-id }
        (merge assignment {
          completed: true,
          performance-rating: rating
        })
      )

      ;; Update contractor rating (simple average)
      (ok (map-set contractors
        { contractor-id: contractor-id }
        (merge contractor {
          rating: (if (is-eq (get rating contractor) u0)
                    rating
                    (/ (+ (get rating contractor) rating) u2))
        })
      ))
    )
  )
)

;; Check if contractor is verified
(define-read-only (is-contractor-verified (contractor-id (string-ascii 36)))
  (match (map-get? contractors { contractor-id: contractor-id })
    contractor (ok (get verified contractor))
    (err u302)
  )
)

;; Get contractor details
(define-read-only (get-contractor (contractor-id (string-ascii 36)))
  (map-get? contractors { contractor-id: contractor-id })
)

;; Get contractor assignment
(define-read-only (get-contractor-assignment (contractor-id (string-ascii 36)) (project-id (string-ascii 36)))
  (map-get? contractor-projects { contractor-id: contractor-id, project-id: project-id })
)
