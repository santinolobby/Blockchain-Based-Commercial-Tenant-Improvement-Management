;; Project Scope Contract
;; Defines approved modifications to leased space

(define-data-var contract-owner principal tx-sender)

;; Project data structure
(define-map projects
  { project-id: (string-ascii 36) }
  {
    property-id: (string-ascii 36),
    tenant: principal,
    landlord: principal,
    description: (string-ascii 500),
    status: (string-ascii 20),
    start-date: uint,
    end-date: uint,
    approved: bool
  }
)

;; Modification data structure
(define-map modifications
  { project-id: (string-ascii 36), modification-id: (string-ascii 36) }
  {
    description: (string-ascii 200),
    approved: bool,
    completed: bool
  }
)

;; Create a new project
(define-public (create-project
    (project-id (string-ascii 36))
    (property-id (string-ascii 36))
    (landlord principal)
    (description (string-ascii 500))
    (start-date uint)
    (end-date uint))
  (let
    ((caller tx-sender))
    (begin
      (asserts! (is-none (map-get? projects { project-id: project-id })) (err u201))
      (ok (map-set projects
        { project-id: project-id }
        {
          property-id: property-id,
          tenant: caller,
          landlord: landlord,
          description: description,
          status: "pending",
          start-date: start-date,
          end-date: end-date,
          approved: false
        }
      ))
    )
  )
)

;; Approve project (landlord only)
(define-public (approve-project (project-id (string-ascii 36)))
  (let
    ((caller tx-sender)
     (project (unwrap! (map-get? projects { project-id: project-id }) (err u202))))
    (begin
      (asserts! (is-eq caller (get landlord project)) (err u203))
      (ok (map-set projects
        { project-id: project-id }
        (merge project {
          status: "approved",
          approved: true
        })
      ))
    )
  )
)

;; Add modification to project
(define-public (add-modification
    (project-id (string-ascii 36))
    (modification-id (string-ascii 36))
    (description (string-ascii 200)))
  (let
    ((caller tx-sender)
     (project (unwrap! (map-get? projects { project-id: project-id }) (err u202))))
    (begin
      (asserts! (is-eq caller (get tenant project)) (err u204))
      (asserts! (is-none (map-get? modifications { project-id: project-id, modification-id: modification-id })) (err u205))
      (ok (map-set modifications
        { project-id: project-id, modification-id: modification-id }
        {
          description: description,
          approved: false,
          completed: false
        }
      ))
    )
  )
)

;; Approve modification (landlord only)
(define-public (approve-modification (project-id (string-ascii 36)) (modification-id (string-ascii 36)))
  (let
    ((caller tx-sender)
     (project (unwrap! (map-get? projects { project-id: project-id }) (err u202)))
     (modification (unwrap! (map-get? modifications { project-id: project-id, modification-id: modification-id }) (err u206))))
    (begin
      (asserts! (is-eq caller (get landlord project)) (err u203))
      (ok (map-set modifications
        { project-id: project-id, modification-id: modification-id }
        (merge modification { approved: true })
      ))
    )
  )
)

;; Mark modification as completed
(define-public (complete-modification (project-id (string-ascii 36)) (modification-id (string-ascii 36)))
  (let
    ((caller tx-sender)
     (project (unwrap! (map-get? projects { project-id: project-id }) (err u202)))
     (modification (unwrap! (map-get? modifications { project-id: project-id, modification-id: modification-id }) (err u206))))
    (begin
      (asserts! (or (is-eq caller (get tenant project)) (is-eq caller (get landlord project))) (err u207))
      (asserts! (get approved modification) (err u208))
      (ok (map-set modifications
        { project-id: project-id, modification-id: modification-id }
        (merge modification { completed: true })
      ))
    )
  )
)

;; Get project details
(define-read-only (get-project (project-id (string-ascii 36)))
  (map-get? projects { project-id: project-id })
)

;; Get modification details
(define-read-only (get-modification (project-id (string-ascii 36)) (modification-id (string-ascii 36)))
  (map-get? modifications { project-id: project-id, modification-id: modification-id })
)
