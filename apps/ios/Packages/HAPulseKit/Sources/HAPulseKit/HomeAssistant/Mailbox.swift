import Foundation

/// Queue of text frames; `take` waits, `nil` = closed.
public actor Mailbox {
    private var buffer: [String?] = []
    private var waiter: CheckedContinuation<String?, Never>?
    private var closed = false

    public init() {}

    public func put(_ s: String?) {
        if closed { return }
        if s == nil { closed = true }
        if let w = waiter {
            waiter = nil
            w.resume(returning: s)
        } else {
            buffer.append(s)
        }
    }

    public func take() async -> String? {
        if !buffer.isEmpty { return buffer.removeFirst() }
        if closed { return nil }
        return await withCheckedContinuation { waiter = $0 }
    }
}

