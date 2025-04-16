;; Improvement Allowance Contract
;; Manages landlord contribution funds

(define-data-var contract-owner principal tx-sender)

;; Allowance data structure
(define-map allowances
  { project-id: (string-ascii 36) }
  {
    landlord: principal,
    tenant: principal,
    total-amount: uint,
    released-amount: uint,
    remaining-amount: uint,
    status: (string-ascii 20)
  }
)

;; Milestone data structure
(define-map milestones
  { project-id: (string-ascii 36), milestone-id: (string-ascii 36) }
  {
    description: (string-ascii 200),
    amount: uint,
    completed: bool,
    paid: bool
  }
)

;; Create a new allowance
(define-public (create-allowance
    (project-id (string-ascii 36))
    (tenant principal)
    (total-amount uint))
  (let
    ((caller tx-sender))
    (begin
      (asserts! (is-none (map-get? allowances { project-id: project-id })) (err u401))
      (ok (map-set allowances
        { project-id: project-id }
        {
          landlord: caller,
          tenant: tenant,
          total-amount: total-amount,
          released-amount: u0,
          remaining-amount: total-amount,
          status: "active"
        }
      ))
    )
  )
)

;; Add milestone to project
(define-public (add-milestone
    (project-id (string-ascii 36))
    (milestone-id (string-ascii 36))
    (description (string-ascii 200))
    (amount uint))
  (let
    ((caller tx-sender)
     (allowance (unwrap! (map-get? allowances { project-id: project-id }) (err u402))))
    (begin
      (asserts! (is-eq caller (get landlord allowance)) (err u403))
      (asserts! (is-none (map-get? milestones { project-id: project-id, milestone-id: milestone-id })) (err u404))
      (asserts! (<= amount (get remaining-amount allowance)) (err u405))
      (ok (map-set milestones
        { project-id: project-id, milestone-id: milestone-id }
        {
          description: description,
          amount: amount,
          completed: false,
          paid: false
        }
      ))
    )
  )
)

;; Mark milestone as completed
(define-public (complete-milestone (project-id (string-ascii 36)) (milestone-id (string-ascii 36)))
  (let
    ((caller tx-sender)
     (allowance (unwrap! (map-get? allowances { project-id: project-id }) (err u402)))
     (milestone (unwrap! (map-get? milestones { project-id: project-id, milestone-id: milestone-id }) (err u406))))
    (begin
      (asserts! (is-eq caller (get tenant allowance)) (err u407))
      (asserts! (not (get completed milestone)) (err u408))
      (ok (map-set milestones
        { project-id: project-id, milestone-id: milestone-id }
        (merge milestone { completed: true })
      ))
    )
  )
)

;; Release funds for completed milestone
(define-public (release-funds (project-id (string-ascii 36)) (milestone-id (string-ascii 36)))
  (let
    ((caller tx-sender)
     (allowance (unwrap! (map-get? allowances { project-id: project-id }) (err u402)))
     (milestone (unwrap! (map-get? milestones { project-id: project-id, milestone-id: milestone-id }) (err u406))))
    (begin
      (asserts! (is-eq caller (get landlord allowance)) (err u403))
      (asserts! (get completed milestone) (err u409))
      (asserts! (not (get paid milestone)) (err u410))

      ;; Update milestone
      (map-set milestones
        { project-id: project-id, milestone-id: milestone-id }
        (merge milestone { paid: true })
      )

      ;; Update allowance
      (ok (map-set allowances
        { project-id: project-id }
        (merge allowance {
          released-amount: (+ (get released-amount allowance) (get amount milestone)),
          remaining-amount: (- (get remaining-amount allowance) (get amount milestone))
        })
      ))
    )
  )
)

;; Close allowance
(define-public (close-allowance (project-id (string-ascii 36)))
  (let
    ((caller tx-sender)
     (allowance (unwrap! (map-get? allowances { project-id: project-id }) (err u402))))
    (begin
      (asserts! (is-eq caller (get landlord allowance)) (err u403))
      (ok (map-set allowances
        { project-id: project-id }
        (merge allowance { status: "closed" })
      ))
    )
  )
)

;; Get allowance details
(define-read-only (get-allowance (project-id (string-ascii 36)))
  (map-get? allowances { project-id: project-id })
)

;; Get milestone details
(define-read-only (get-milestone (project-id (string-ascii 36)) (milestone-id (string-ascii 36)))
  (map-get? milestones { project-id: project-id, milestone-id: milestone-id })
)
